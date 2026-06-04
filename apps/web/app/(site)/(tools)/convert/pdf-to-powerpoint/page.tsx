import { LibreOfficeConvert } from '@/components/pdf/LibreOfficeConvert';

export default function PdfToPowerpointPage() {
  return (
    <LibreOfficeConvert
      slug="pdf-to-powerpoint"
      target="pptx"
      accept={{ 'application/pdf': ['.pdf'] }}
      label="Drop a PDF to convert to PowerPoint"
      outExt="pptx"
      outMime="application/vnd.openxmlformats-officedocument.presentationml.presentation"
      enhanceable
    />
  );
}
