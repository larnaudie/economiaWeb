import { Pencil } from "lucide-react";
import { Button } from "./Button";

export function EditIconButton({ label = "Editar", ...props }) {
  return (
    <Button
      aria-label={label}
      className="icon-edit-button"
      title={label}
      variant="secondary"
      {...props}
    >
      <Pencil aria-hidden="true" size={16} strokeWidth={2.2} />
    </Button>
  );
}
