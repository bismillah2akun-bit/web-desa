import { DocxEditor, useFonts } from "@docx-editor.dev/react";
import { packagedFonts } from "@docx-editor.dev/fonts";
import "@docx-editor.dev/core/styles/editor.css";

export default function NativeDocumentEditor({ ref, bytes, filename, preview, onReady, onChange, onSave }) {
  // Packaged, locally served font metrics. No Google Fonts/document SaaS requests.
  const fonts = useFonts(packagedFonts());
  return <DocxEditor ref={ref} document={bytes} fonts={fonts} mode={preview ? "view" : "edit"}
    title={filename} locale="id-ID" colorMode="light" chrome={false} menu={false} navigation={false}
    zoomMode="auto" rulers={false} onReady={onReady} onChange={onChange} onSave={onSave}
    className="letter-native-editor" />;
}
