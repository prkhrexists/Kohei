import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

type ReportViewerProps = {
  url: string;
};

export function ReportViewer({ url }: ReportViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const handleDocumentLoad = ({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setPage(1);
  };

  const controls = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setScale((prev) => Math.max(0.6, prev - 0.1))}>
          Zoom out
        </Button>
        <Button variant="secondary" onClick={() => setScale((prev) => Math.min(1.6, prev + 0.1))}>
          Zoom in
        </Button>
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Button variant="ghost" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Prev
          </Button>
          <span>
            Page {page} of {numPages}
          </span>
          <Button variant="ghost" onClick={() => setPage((prev) => Math.min(numPages, prev + 1))}>
            Next
          </Button>
        </div>
      </div>
    ),
    [numPages, page]
  );

  if (isMobile) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-[var(--muted)]">
          PDF preview is best on desktop. Use the download link to view the report.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        {controls}
        <div className="flex justify-center rounded-2xl border border-[var(--border)] bg-[#221f1b] p-4">
          <Document file={url} onLoadSuccess={handleDocumentLoad} loading="Loading PDF...">
            <Page pageNumber={page} scale={scale} />
          </Document>
        </div>
      </CardContent>
    </Card>
  );
}
