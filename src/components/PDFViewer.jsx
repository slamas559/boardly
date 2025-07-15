import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
// import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'

// Correctly set worker source
// pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();

const PDFViewer = ({ isTutor, room, token }) => {
  const { socket } = useSocket();
  const [pdfUrl, setPdfUrl] = useState(room?.pdf?.url || "");
  const [pageNumber, setPageNumber] = useState(room?.pdf?.currentPage || 1);
  const [numPages, setNumPages] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    if (room?.pdf?.url) {
      setPdfUrl(room.pdf.url);
    }
  }, [room]);

  useEffect(() => {
    socket.on("pdf-page-change", ({ page }) => {
      setPageNumber(page);
    });

    socket.on("pdf-updated", ({ url }) => {
      setPdfUrl(url);
      setPageNumber(1);
    });

    return () => {
      socket.off("pdf-page-change");
      socket.off("pdf-updated");
    };
  }, [socket]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleUpload = async () => {
    if (!pdfFile) return;

    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("roomId", room._id);

    const res = await axios.post("http://localhost:5000/pdf/upload", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    const uploadedUrl = res.data.pdf.url;
    setPdfUrl(uploadedUrl);
    setPageNumber(1);
    socket.emit("pdf-updated", { url: uploadedUrl, room: room._id });
    console.log("Uploaded PDF URL:", uploadedUrl);
  };

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > numPages) return;
    setPageNumber(newPage);
    socket.emit("pdf-page-change", { page: newPage, room: room._id });
  };

  return (
    <div className="w-full h-full p-5 flex flex-col items-center">
      {isTutor && (
        <div className="mb-4 w-full gap-2 items-center">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files[0])}
          />
          <button onClick={handleUpload} className="px-3 py-1 bg-primary text-white rounded">
            Upload
          </button>
        </div>
      )}

      {pdfUrl ? (
        <>
          <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
            <Page pageNumber={pageNumber} width={500} />
          </Document>
          <div className="mt-4 flex gap-4 items-center">
            <button
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="px-3 py-1 bg-gray-300 rounded"
            >
              Prev
            </button>
            <span>
              Page {pageNumber} / {numPages}
            </span>
            <button
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageNumber >= numPages}
              className="px-3 py-1 bg-gray-300 rounded"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <p className="text-gray-600 mt-4">No PDF uploaded for this session yet.</p>
      )}
    </div>
  );
};

export default PDFViewer;
