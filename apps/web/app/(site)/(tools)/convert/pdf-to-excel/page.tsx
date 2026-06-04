import { LibreOfficeConvert } from '@/components/pdf/LibreOfficeConvert';

export default function PdfToExcelPage() {
  return (
    <LibreOfficeConvert
      slug="pdf-to-excel"
      target="xlsx"
      accept={{ 'application/pdf': ['.pdf'] }}
      label="Drop a PDF to convert to Excel"
      outExt="xlsx"
      outMime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    />
  );
}
