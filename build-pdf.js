const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { marked } = require('marked');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function getHtmlTemplate(title, subtitle, contentHtml) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,400;1,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({
            startOnLoad: true,
            theme: 'base',
            themeVariables: {
                primaryColor: '#001F35',
                primaryTextColor: '#FFFFFF',
                primaryBorderColor: '#B9915B',
                lineColor: '#B9915B',
                secondaryColor: '#F4EFE6',
                tertiaryColor: '#FFFFFF',
                edgeLabelBackground: '#FFFFFF',
                fontFamily: 'Inter, sans-serif'
            }
        });
    </script>
    <style>
        @page {
            size: A4;
            margin: 20mm 15mm 20mm 15mm;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #1A202C;
            background-color: #FFFFFF;
            line-height: 1.6;
            font-size: 10pt;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* Top Header Brand Banner */
        .doc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #B9915B;
            padding-bottom: 12px;
            margin-bottom: 24px;
        }

        .brand-monogram-box {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .monogram {
            background: linear-gradient(135deg, #001F35, #06263F);
            color: #B9915B;
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            font-size: 16pt;
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            border: 1px solid #B9915B;
            box-shadow: 0 2px 8px rgba(0, 31, 53, 0.2);
        }

        .brand-title {
            font-size: 13pt;
            font-weight: 700;
            color: #001F35;
            letter-spacing: 1.5px;
            margin: 0;
        }

        .brand-tagline {
            font-size: 7.5pt;
            color: #B9915B;
            font-weight: 600;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 0;
        }

        .doc-badge {
            background-color: #001F35;
            color: #B9915B;
            font-size: 8pt;
            font-weight: 600;
            padding: 5px 12px;
            border-radius: 20px;
            border: 1px solid #B9915B;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Cover Title Section */
        .title-block {
            background: linear-gradient(135deg, #001F35 0%, #06263F 100%);
            color: #FFFFFF;
            padding: 24px;
            border-radius: 10px;
            margin-bottom: 24px;
            border-left: 5px solid #B9915B;
            box-shadow: 0 4px 14px rgba(0, 31, 53, 0.15);
        }

        .title-block h1 {
            color: #FFFFFF;
            font-size: 20pt;
            margin: 0 0 8px 0;
            font-weight: 700;
            letter-spacing: -0.5px;
        }

        .title-block .subtitle {
            color: #C9A96E;
            font-size: 11pt;
            margin: 0;
            font-weight: 400;
        }

        /* Typography & Headings */
        h1, h2, h3, h4, h5, h6 {
            color: #001F35;
            font-weight: 700;
            page-break-after: avoid;
            break-after: avoid;
        }

        h1 {
            font-size: 16pt;
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 6px;
            margin-top: 24px;
            margin-bottom: 14px;
        }

        h2 {
            font-size: 13pt;
            border-bottom: 1.5px solid #B9915B;
            padding-bottom: 4px;
            margin-top: 22px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        h3 {
            font-size: 11pt;
            margin-top: 16px;
            margin-bottom: 8px;
            color: #06263F;
        }

        h4 {
            font-size: 10pt;
            margin-top: 12px;
            margin-bottom: 6px;
        }

        p {
            margin: 0 0 10px 0;
            text-align: justify;
        }

        .serif-italic, em, i {
            font-family: 'Playfair Display', serif;
            font-style: italic;
        }

        /* Lists */
        ul, ol {
            margin: 0 0 12px 0;
            padding-left: 20px;
        }

        li {
            margin-bottom: 4px;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 9pt;
            page-break-inside: avoid;
        }

        th {
            background-color: #001F35;
            color: #B9915B;
            font-weight: 600;
            text-align: left;
            padding: 8px 12px;
            border: 1px solid #06263F;
            letter-spacing: 0.5px;
        }

        td {
            padding: 7px 12px;
            border: 1px solid #E2E8F0;
        }

        tr:nth-child(even) td {
            background-color: #F8FAFC;
        }

        /* Code Blocks & Inline Code */
        code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 8.5pt;
            background-color: #F1F5F9;
            color: #0F172A;
            padding: 2px 5px;
            border-radius: 4px;
            border: 1px solid #E2E8F0;
        }

        pre {
            background-color: #01121E;
            color: #E2E8F0;
            padding: 14px 16px;
            border-radius: 8px;
            overflow-x: auto;
            border-left: 4px solid #B9915B;
            margin: 14px 0;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        pre code {
            background-color: transparent;
            color: #E2E8F0;
            padding: 0;
            border: none;
            font-size: 8pt;
            line-height: 1.5;
        }

        /* Blockquotes and Alerts */
        blockquote {
            margin: 14px 0;
            padding: 10px 16px;
            background-color: #F4EFE6;
            border-left: 4px solid #B9915B;
            border-radius: 4px;
            color: #001F35;
            font-style: normal;
        }

        blockquote p {
            margin: 0;
        }

        .alert-box {
            padding: 10px 14px;
            border-radius: 6px;
            margin: 14px 0;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-size: 9pt;
            page-break-inside: avoid;
        }

        .alert-note {
            background-color: #EFF6FF;
            border-left: 4px solid #3B82F6;
            color: #1E3A8A;
        }

        .alert-important {
            background-color: #FEF3C7;
            border-left: 4px solid #F59E0B;
            color: #92400E;
        }

        /* Mermaid Diagrams Container */
        .mermaid {
            display: flex;
            justify-content: center;
            margin: 18px 0;
            background: #FAFAFA;
            padding: 14px;
            border-radius: 8px;
            border: 1px solid #E2E8F0;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .mermaid svg {
            max-width: 100% !important;
            height: auto !important;
        }

        /* Footer */
        .doc-footer {
            margin-top: 30px;
            border-top: 1px solid #E2E8F0;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8pt;
            color: #64748B;
        }

        hr {
            border: none;
            border-top: 1px solid #E2E8F0;
            margin: 20px 0;
        }
    </style>
</head>
<body>

    <div class="doc-header">
        <div class="brand-monogram-box">
            <div class="monogram">DS</div>
            <div>
                <div class="brand-title">DASH SOLUTIONS</div>
                <div class="brand-tagline">Enterprise Technology & Cloud Systems</div>
            </div>
        </div>
        <div class="doc-badge">Documento Oficial</div>
    </div>

    <div class="title-block">
        <h1>${title}</h1>
        <div class="subtitle">${subtitle}</div>
    </div>

    <div class="content-body">
        ${contentHtml}
    </div>

    <div class="doc-footer">
        <div><strong>Dash Solutions</strong> • Documento Corporativo Confidencial • Belém • Pará</div>
        <div>Uso Exclusivo & Governança de TI</div>
    </div>

</body>
</html>`;
}

function processMarkdown(mdContent) {
    // Substitui alerts do GitHub (> [!NOTE] ...)
    let processed = mdContent.replace(/>\s*\[!NOTE\]\s*\n((?:>.*\n?)*)/gi, (match, p1) => {
        const text = p1.replace(/^>\s?/gm, '');
        return `<div class="alert-box alert-note"><strong>NOTA:</strong> ${text}</div>\n`;
    });

    processed = processed.replace(/>\s*\[!IMPORTANT\]\s*\n((?:>.*\n?)*)/gi, (match, p1) => {
        const text = p1.replace(/^>\s?/gm, '');
        return `<div class="alert-box alert-important"><strong>IMPORTANTE:</strong> ${text}</div>\n`;
    });

    // Remove título inicial H1 duplicado se for virar o título do cover
    const lines = processed.split('\n');
    let firstH1 = '';
    let bodyLines = [];
    for (let i = 0; i < lines.length; i++) {
        if (!firstH1 && lines[i].startsWith('# ')) {
            firstH1 = lines[i].replace('# ', '').trim();
        } else {
            bodyLines.push(lines[i]);
        }
    }

    const htmlContent = marked.parse(bodyLines.join('\n'));

    // Tratar blocos do Mermaid (<pre><code class="language-mermaid">...</code></pre> -> <div class="mermaid">...</div>)
    const finalHtml = htmlContent.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi, (match, code) => {
        const decoded = code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        return `<div class="mermaid">${decoded}</div>`;
    });

    return { title: firstH1 || 'Documento Dash Solutions', html: finalHtml };
}

function generatePdf(mdFileName, pdfFileName, subtitle) {
    console.log(`[PDF] Processando ${mdFileName}...`);
    const mdPath = path.join(__dirname, mdFileName);
    const mdContent = fs.readFileSync(mdPath, 'utf-8');

    const { title, html } = processMarkdown(mdContent);
    const fullHtml = getHtmlTemplate(title, subtitle, html);

    const tempHtmlPath = path.join(__dirname, `_temp_${path.parse(mdFileName).name}.html`);
    fs.writeFileSync(tempHtmlPath, fullHtml, 'utf-8');

    const outputPdfPath = path.join(__dirname, pdfFileName);

    console.log(`[PDF] Renderizando via Google Chrome Headless para ${pdfFileName}...`);
    // Chrome headless flag com virtual time budget para renderizar Mermaid e fontes
    const cmd = `"${CHROME_PATH}" --headless=new --run-all-compositor-stages-before-draw --virtual-time-budget=6000 --no-pdf-header-footer --print-to-pdf="${outputPdfPath}" "file://${tempHtmlPath.replace(/\\/g, '/')}"`;

    try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(`[PDF] Sucesso! PDF gerado: ${outputPdfPath}`);
        if (fs.existsSync(tempHtmlPath)) {
            fs.unlinkSync(tempHtmlPath);
        }
    } catch (err) {
        console.error(`[PDF] Erro ao gerar PDF:`, err.message);
    }
}

// 1. Apresentação da Plataforma
generatePdf(
    'APRESENTACAO_DASH_SOLUTIONS.md',
    'APRESENTACAO_DASH_SOLUTIONS.pdf',
    'Apresentação Executiva e Técnica da Plataforma • Soluções & CMS Headless-Light'
);

// 2. Guia de Implantação no Google Cloud
generatePdf(
    'GUIA_IMPLANTACAO_GOOGLE_CLOUD.md',
    'GUIA_IMPLANTACAO_GOOGLE_CLOUD.pdf',
    'Guia de Engenharia e Orientação de Implantação no Google Cloud Platform (GCP)'
);
