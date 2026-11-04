{{-- Estilos compartidos de los documentos impresos (factura, cotización, orden de trabajo).
     Media carta, con la distribución del talonario físico. DomPDF no soporta flexbox:
     toda la maquetación se hace con tablas. --}}
<style>
    @page { margin: 16pt 16pt 18pt 16pt; }
    * { margin: 0; padding: 0; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 7pt; color: #111; }
    table { border-collapse: collapse; width: 100%; }
    td, th { vertical-align: top; }
    .r { text-align: right; }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .mono { font-family: DejaVu Sans Mono, monospace; }
    .muted { color: #555; }

    /* Encabezado */
    .logo { width: 50pt; height: 50pt; }
    .shop-name { font-size: 12.5pt; font-weight: bold; text-align: center; line-height: 1.15; }
    .shop-owner { font-size: 6.5pt; font-weight: bold; text-align: center; margin-top: 2pt; }
    .shop-meta { font-size: 6.5pt; font-style: italic; text-align: center; line-height: 1.35; margin-top: 1pt; }

    /* Título, número y fecha */
    .doc-title { font-size: 9pt; font-weight: bold; }
    .doc-number { font-size: 10pt; font-weight: bold; color: #b91c1c; margin-top: 2pt; }
    .doc-meta { font-size: 6.5pt; margin-top: 2pt; line-height: 1.35; }
    .date-box { border: 1.2pt solid #111; }
    .date-box th { font-size: 6.5pt; padding: 1.5pt 0; border-bottom: 1pt solid #111; }
    .date-box td { font-size: 8pt; font-weight: bold; text-align: center; padding: 2.5pt 0; }
    .date-box th + th, .date-box td + td { border-left: 1pt solid #111; }

    /* Datos fiscales */
    .fiscal { border: 1pt solid #111; margin-top: 6pt; }
    .fiscal td { font-size: 6.5pt; padding: 2pt 5pt; }
    .fiscal .rtn { font-size: 8.5pt; font-weight: bold; }

    /* Cliente */
    .client { border: 1.2pt solid #111; margin-top: 5pt; }
    .client td { padding: 3pt 6pt; font-size: 7.5pt; }
    .client .lbl { width: 50pt; font-weight: bold; white-space: nowrap; }
    .client .line { border-bottom: 0.6pt solid #555; }
    .client .extra { font-size: 6.3pt; color: #444; padding-top: 0; }

    /* Bloques de texto (descripción, diagnóstico, notas) */
    .box { border: 1.2pt solid #111; margin-top: 5pt; }
    .box .ttl { font-size: 6.5pt; font-weight: bold; padding: 2pt 6pt; border-bottom: 1pt solid #111; background: #f1f1f1; }
    .box .txt { font-size: 7pt; padding: 3pt 6pt; line-height: 1.35; white-space: pre-wrap; }

    /* Detalle */
    .items { border: 1.2pt solid #111; margin-top: 5pt; }
    .items th { font-size: 6.3pt; font-weight: bold; padding: 2.5pt 3pt; border-bottom: 1.2pt solid #111; border-left: 1pt solid #111; text-align: center; line-height: 1.1; }
    .items td { font-size: 7pt; padding: 2.5pt 4pt; border-left: 1pt solid #111; border-bottom: 0.5pt solid #bbb; height: 11pt; }
    .items th:first-child, .items td:first-child { border-left: none; }
    .items tr.group td { background: #f1f1f1; font-size: 6.3pt; font-weight: bold; height: auto; padding: 1.5pt 4pt; }
    .items tr.sum td { border-top: 1.2pt solid #111; border-bottom: none; font-weight: bold; }
    .items .sub { font-size: 6pt; color: #555; }

    /* Pie: columna izquierda | totales */
    .foot { border: 1.2pt solid #111; border-top: none; page-break-inside: avoid; }
    .foot > tbody > tr > td { padding: 0; }
    .left-col { border-right: 1.2pt solid #111; padding: 4pt 6pt !important; }
    .sig { border-top: 0.8pt solid #111; margin: 16pt 20pt 1.5pt; }
    .sig-lbl { font-size: 6.5pt; text-align: center; font-weight: bold; }
    .issued { font-size: 6.5pt; text-align: center; margin-top: 4pt; }
    .copies { font-size: 5.5pt; text-align: center; margin-top: 4pt; color: #444; }
    .totals td { font-size: 6.3pt; padding: 2.3pt 4pt; border-bottom: 1pt solid #111; line-height: 1.1; }
    .totals .lbl { font-weight: bold; width: 54%; }
    .totals .cur { width: 9%; font-weight: bold; }
    .totals .amt { text-align: right; border-left: 1pt solid #111; font-size: 7pt; }
    .totals tr:last-child td { border-bottom: none; }
    .totals .grand td { font-size: 8.5pt; font-weight: bold; }

    /* Total en letras y cierre */
    .letters { border: 1.2pt solid #111; border-top: none; padding: 3pt 6pt; }
    .letters .lbl { font-size: 7pt; font-weight: bold; }
    .paid { font-size: 6.5pt; margin-top: 3pt; }
    .note { font-size: 6.3pt; color: #444; text-align: center; margin-top: 4pt; }
    .tagline { text-align: center; font-size: 8pt; font-weight: bold; font-style: italic; margin-top: 4pt; }
    .signatures { margin-top: 18pt; }
    .signatures td { padding: 0 10pt; }
    .signatures .sig { margin: 0 0 1.5pt; }
    .page-num { position: fixed; bottom: -10pt; right: 0; font-size: 5.5pt; color: #777; }
    .page-num .n:before { content: counter(page); }
</style>
