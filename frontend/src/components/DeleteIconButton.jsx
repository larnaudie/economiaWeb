import { Eraser } from "lucide-react";
import { Button } from "./Button";

export function DeleteIconButton({ label = "Eliminar", ...props }) {
  return (
    <Button
      aria-label={label}
      className="icon-delete-button"
      title={label}
      variant="danger"
      {...props}
    >
      <Eraser aria-hidden="true" size={16} strokeWidth={2.2} />
    </Button>
  );
}
