import { LibreOfficeConvert } from '@/components/pdf/LibreOfficeConvert';

export default function PdfToWordPage() {
  return (
    <LibreOfficeConvert
      slug="pdf-to-word"
      target="docx"
      accept={{ 'application/pdf': ['.pdf'] }}
      label="Drop a PDF to convert to Word"
      outExt="docx"
      outMime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    />
  );
}
