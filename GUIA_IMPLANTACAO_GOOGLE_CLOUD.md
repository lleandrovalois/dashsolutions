# Guia de Orientação para Implantação no Google Cloud Platform (GCP)
### Dash Solutions — Plataforma Corporativa & CMS

---

## 1. Visão Geral da Arquitetura em Nuvem

A plataforma **Dash Solutions** foi projetada para ser nativa para contêineres (*Cloud-Native*), operando com altíssima eficiência e consumo reduzido de recursos. No **Google Cloud Platform (GCP)**, a arquitetura recomendada adota o modelo **Serverless Container** com **Google Cloud Run**, eliminando a necessidade de gerenciar sistemas operacionais ou máquinas virtuais e garantindo resiliência, escalabilidade automática e custo otimizado.

```mermaid
flowchart TD
    subgraph Edge [Borda & Segurança - GCP]
        DNS[Cloud DNS / Domínio Corporativo] --> LB[Cloud Load Balancing HTTPS]
        LB --> CDN[Cloud CDN - Cache Estático]
        LB --> WAF[Cloud Armor - Defesa DDoS & WAF]
    end

    subgraph Compute [Camada de Computação Serverless]
        WAF --> Run[Google Cloud Run\n(Dash Solutions Container)]
        Registry[(Artifact Registry\nDocker Image)] -.->|Pull Image| Run
    end

    subgraph Persistence [Persistência & Segredos]
        Run -->|Volume Mount GCS FUSE| Bucket[(Cloud Storage Bucket\nJSON Data & Backups)]
        Run -->|Env Injection| Secrets[Secret Manager\n(ADMIN_TOKEN)]
    end

    subgraph Observability [Governança & Observabilidade]
        Run --> Logs[Cloud Logging]
        Run --> Metrics[Cloud Monitoring & Uptime Checks]
    end
```

---

## 2. Modelos de Implantação no GCP

| Critério | Cenário A: Cloud Run (Recomendado) | Cenário B: Compute Engine (GCE) | Cenário C: Google Kubernetes Engine (GKE) |
| :--- | :--- | :--- | :--- |
| **Tipo de Infraestrutura** | Serverless / Gerenciada | Máquina Virtual (IaaS) | Cluster Kubernetes Orquestrado |
| **Complexidade Operacional** | Mínima (zero manutenção de SO) | Média (requer patches de SO e Docker) | Alta (requer governança de cluster K8s) |
| **Persistência de Dados** | Cloud Storage Volume Mount (GCS FUSE) | Disco Persistente Anexado (Persistent Disk) | Persistent Volume Claim (Filestore / GCE PD) |
| **Escalabilidade** | Automática (0 a N instâncias em segundos) | Manual ou via Managed Instance Groups | Automática via Horizontal Pod Autoscaler |
| **Custo Estimado** | **$ 0,00 a $ 5,00 / mês** (coberto pelo Free Tier) | **$ 15,00 a $ 40,00 / mês** (instância e2-micro/small) | **$ 75,00+ / mês** (custo de nós e control plane) |
| **Indicação Principal** | **Produção Padrão Ouro** | Migrações diretas de Docker Compose | Ambientes corporativos com dezenas de microsserviços |

---

## 3. Passo a Passo de Implantação no Google Cloud Run (Cenário Recomendado)

### 3.1. Pré-Requisitos
1. Uma conta ativa no **Google Cloud Platform** com faturamento (*Billing*) habilitado.
2. O utilitário **Google Cloud SDK (`gcloud` CLI)** instalado no ambiente de desenvolvimento ou acesso via **Google Cloud Shell**.
3. Permissões de IAM: `Owner`, `Editor` ou papéis administrativos específicos (`Run Admin`, `Storage Admin`, `Secret Manager Admin`, `Artifact Registry Admin`).

---

### 3.2. Passo 1 — Autenticação e Configuração do Projeto

Abra o terminal (PowerShell ou Bash) e execute:

```powershell
# 1. Login no Google Cloud
gcloud auth login

# 2. Defina o ID do seu projeto no GCP
$PROJECT_ID = "seu-projeto-gcp"
gcloud config set project $PROJECT_ID

# 3. Defina a região padrão (ex: us-central1 ou southamerica-east1 em São Paulo)
$REGION = "southamerica-east1"
gcloud config set run/region $REGION
```

---

### 3.3. Passo 2 — Habilitação das APIs Necessárias

Habilite os serviços do GCP utilizados pela arquitetura:

```powershell
gcloud services enable `
    run.googleapis.com `
    artifactregistry.googleapis.com `
    cloudbuild.googleapis.com `
    secretmanager.googleapis.com `
    storage.googleapis.com `
    compute.googleapis.com
```

---

### 3.4. Passo 3 — Criação da Conta de Serviço (Service Account) com Menor Privilégio

Crie uma identidade de serviço dedicada para a aplicação executar no Cloud Run com apenas os acessos estritamente necessários:

```powershell
# Criação da Service Account
gcloud iam service-accounts create dash-solutions-sa `
    --description="Service Account para a aplicacao Dash Solutions no Cloud Run" `
    --display-name="Dash Solutions Runner"

$SA_EMAIL = "dash-solutions-sa@$PROJECT_ID.iam.gserviceaccount.com"
```

---

### 3.5. Passo 4 — Gerenciamento Seguro de Credenciais no Secret Manager

Para não expor a chave de administração (`ADMIN_TOKEN`) em arquivos ou variáveis abertas:

```powershell
# Criação do segredo com a chave administrativa (ex: dash@2026 ou sua chave definitiva)
echo -n "dash@2026" | gcloud secrets create dash-admin-token `
    --replication-policy="automatic" `
    --data-file=-

# Conceder permissão de leitura do segredo à Service Account
gcloud secrets add-iam-policy-binding dash-admin-token `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/secretmanager.secretAccessor"
```

---

### 3.6. Passo 5 — Armazenamento Persistente no Cloud Storage (GCS)

Como os contêineres do Cloud Run são efêmeros por padrão, montamos um bucket do Cloud Storage diretamente no contêiner usando a funcionalidade nativa de **Volume Mount (GCS FUSE)** do Cloud Run:

```powershell
# 1. Criar o bucket com nome global exclusivo
$BUCKET_NAME = "dash-solutions-data-$PROJECT_ID"
gcloud storage buckets create gs://$BUCKET_NAME `
    --location=$REGION `
    --uniform-bucket-level-access

# 2. Fazer o upload inicial dos arquivos de dados existentes
gcloud storage cp content.json gs://$BUCKET_NAME/content.json
gcloud storage cp portfolio.json gs://$BUCKET_NAME/portfolio.json
gcloud storage cp theme.json gs://$BUCKET_NAME/theme.json

# 3. Conceder permissão de leitura e escrita à Service Account no bucket
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/storage.objectUser"
```

---

### 3.7. Passo 6 — Criação do Repositório no Artifact Registry e Build da Imagem

Crie o repositório de contêineres privado e envie a imagem através do **Google Cloud Build**:

```powershell
# 1. Criar o repositório Docker
gcloud artifacts repositories create dash-repo `
    --repository-format=docker `
    --location=$REGION `
    --description="Repositorio de imagens Docker da Dash Solutions"

# 2. Compilar e enviar a imagem usando o Cloud Build (diretamente da pasta raiz do projeto)
gcloud builds submit --tag "$REGION-docker.pkg.dev/$PROJECT_ID/dash-repo/dash-web:latest" .
```

---

### 3.8. Passo 7 — Provisionamento e Deploy no Google Cloud Run

Execute a publicação do serviço configurando os recursos, porta, segredos e a montagem do bucket:

```powershell
gcloud run deploy dash-solutions `
    --image="$REGION-docker.pkg.dev/$PROJECT_ID/dash-repo/dash-web:latest" `
    --platform=managed `
    --region=$REGION `
    --service-account=$SA_EMAIL `
    --port=80 `
    --cpu=1 `
    --memory=512Mi `
    --min-instances=1 `
    --max-instances=10 `
    --concurrency=80 `
    --allow-unauthenticated `
    --set-secrets="ADMIN_TOKEN=dash-admin-token:latest" `
    --add-volume=name=dash-data,type=cloud-storage,bucket=$BUCKET_NAME `
    --add-volume-mount=volume=dash-data,mount-path=/app/data
```

> [!NOTE]
> O parâmetro `--min-instances=1` garante que haverá sempre pelo menos 1 contêiner ativo aquecido, eliminando completamente qualquer efeito de *Cold Start* para os visitantes. Caso deseje custo absolutamente zero durante períodos de inatividade, utilize `--min-instances=0`.

---

### 3.9. Passo 8 — Mapeamento de Domínio e Certificado SSL Gratuito

O Cloud Run disponibiliza certificados gerenciados pelo Google de forma automática e gratuita:

```powershell
# Mapear o domínio corporativo (ex: dash.suaempresa.com.br)
gcloud beta run domain-mappings create `
    --service=dash-solutions `
    --domain=dash.suaempresa.com.br `
    --region=$REGION
```
O comando retornará os registros DNS do tipo `CNAME` ou `A/AAAA` que devem ser inseridos na sua zona de DNS (ex: Cloud DNS, Registro.br, Cloudflare). Em poucos minutos o certificado SSL/TLS será emitido e renovado automaticamente pela infraestrutura do Google.

---

## 4. Camada de Borda, Cache e Defesa Cibernética (Cloud Armor & CDN)

Para empresas com exigência de conformidade estrita e proteção contra-ataques distribuídos (DDoS):

1. **Cloud Load Balancing (HTTP/S):** Ponto de entrada global com IP estático Anycast.
2. **Cloud CDN:** Habilitado no backend service do Load Balancer, entregando arquivos de imagem, CSS e JS a partir dos pontos de presença (PoPs) do Google mais próximos do usuário, acelerando o carregamento para menos de 100ms.
3. **Google Cloud Armor (WAF):**
   - Criação de políticas de inspeção de tráfego contra *OWASP Top 10*.
   - Limitação de taxa de requisições (*Rate Limiting*) para proteção do endpoint `/api/*`.

```powershell
# Exemplo de criação de política de segurança no Cloud Armor
gcloud compute security-policies create dash-armor-policy `
    --description="Politica de protecao para Dash Solutions"

# Regra de proteção contra ataques DDoS e flood de requisições
gcloud compute security-policies rules create 1000 `
    --security-policy=dash-armor-policy `
    --expression="origin.region_code != 'BR' && origin.region_code != 'US'" `
    --action="deny-403" `
    --description="Bloqueio de trafego de origens nao autorizadas"
```

---

## 5. Esteira de Integração e Entrega Contínua (CI/CD)

### Opção A: Automação Nativa com Google Cloud Build

Crie o arquivo [cloudbuild.yaml](file:///c:/Users/cvalois/Documents/Antigravity/dashsolutions/cloudbuild.yaml) na raiz do projeto:

```yaml
steps:
  # 1. Compilação da Imagem Docker
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '$_REGION-docker.pkg.dev/$PROJECT_ID/dash-repo/dash-web:$SHORT_SHA', '.']

  # 2. Envio da imagem ao Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '$_REGION-docker.pkg.dev/$PROJECT_ID/dash-repo/dash-web:$SHORT_SHA']

  # 3. Deploy no Google Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'dash-solutions'
      - '--image=$_REGION-docker.pkg.dev/$PROJECT_ID/dash-repo/dash-web:$SHORT_SHA'
      - '--region=$_REGION'
      - '--platform=managed'

substitutions:
  _REGION: southamerica-east1

options:
  logging: CLOUD_LOGGING_ONLY
```

### Opção B: GitHub Actions com Workload Identity Federation (Sem Chaves Estáticas)

Para repositórios hospedados no GitHub, utilize a autenticação segura do Google via OIDC:

```yaml
name: Deploy to Google Cloud

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
    - name: Checkout Código
      uses: actions/checkout@v4

    - name: Autenticar no GCP via Workload Identity
      uses: google-github-actions/auth@v2
      with:
        workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider'
        service_account: 'dash-solutions-sa@${{ secrets.GCP_PROJECT_ID }}.iam.gserviceaccount.com'

    - name: Configurar gcloud
      uses: google-github-actions/setup-gcloud@v2

    - name: Build e Deploy no Cloud Run
      run: |
        gcloud builds submit --tag southamerica-east1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/dash-repo/dash-web:${{ github.sha }} .
        gcloud run deploy dash-solutions \
          --image=southamerica-east1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/dash-repo/dash-web:${{ github.sha }} \
          --region=southamerica-east1
```

---

## 6. Governança, Monitoramento e Rotina de Backup no GCP

### 6.1. Monitoramento e Alertas Proativos
- **Uptime Checks:** Crie uma checagem de disponibilidade contínua no **Cloud Monitoring** apontando para `https://seu-dominio/`.
- **Alert Policies:** Configure alertas para disparar notificações por e-mail ou Slack caso a taxa de erro HTTP 5xx ultrapasse 1% ou a latência passe de 1.500ms.

### 6.2. Política de Ciclo de Vida e Backup no Cloud Storage
Configure versionamento automático no bucket de dados para garantir que qualquer exclusão ou modificação acidental possa ser revertida:

```powershell
# Ativar versionamento no bucket do Cloud Storage
gcloud storage buckets update gs://$BUCKET_NAME --versioning

# Criar rotina para reter backups por 90 dias
gcloud storage buckets update gs://$BUCKET_NAME --lifecycle-file=lifecycle.json
```

---

## 7. Estimativa de Custos no Google Cloud (GCP)

| Recurso do GCP | Camada Gratuita (*Always Free*) | Custo Estimado (Baixo Tráfego) | Custo Estimado (Alto Tráfego ~500k req/mês) |
| :--- | :--- | :--- | :--- |
| **Cloud Run** | 2 milhões de requisições / mês | **R$ 0,00** | R$ 10,00 – R$ 25,00 |
| **Cloud Storage** | 5 GB de armazenamento padrão | **R$ 0,00** | R$ 1,50 |
| **Artifact Registry** | 500 MB de armazenamento | **R$ 0,00** | R$ 1,00 |
| **Secret Manager** | 6 versões de segredos ativas | **R$ 0,00** | **R$ 0,00** |
| **Cloud DNS** | N/A (1 zona gerenciada) | R$ 2,50 | R$ 2,50 |
| **Certificados SSL** | Ilimitados e gerenciados | **Gratuito** | **Gratuito** |
| **Total Mensal Estimado** | — | **~ R$ 2,50 a R$ 15,00 / mês** | **~ R$ 25,00 a R$ 50,00 / mês** |

---

## 8. Checklist de Verificação Pós-Implantação

- [ ] Serviço Cloud Run respondendo com status HTTP `200 OK` na URL gerada.
- [ ] Certificado SSL ativo e válido sem avisos de segurança no navegador.
- [ ] Autenticação administrativa testada no CMS com a chave injetada via Secret Manager.
- [ ] Teste de persistência: alteração realizada no CMS refletida no bucket `gs://$BUCKET_NAME`.
- [ ] Backup automático (`.bak`) gerado no bucket de armazenamento.
- [ ] Uptime check configurado no Cloud Monitoring com notificação de alerta ativa.
- [ ] Bloqueio de IP ou regras de segurança validadas no Cloud Armor (se contratado).
