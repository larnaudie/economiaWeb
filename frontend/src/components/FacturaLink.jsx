export function FacturaLink({ className = "text-link table-link", url }) {
  if (!url) return "N/A";

  function handleClick(event) {
    if (!String(url).startsWith("data:")) return;

    event.preventDefault();

    const [header, data] = url.split(",");
    const mime = header.match(/data:(.*?);/)?.[1] || "application/octet-stream";
    const binary = window.atob(data || "");
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");

    if (!opened) {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = mime.includes("pdf") ? "factura.pdf" : "factura";
      link.click();
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  return (
    <a className={className} href={url} onClick={handleClick} rel="noreferrer" target="_blank">
      Ver
    </a>
  );
}
