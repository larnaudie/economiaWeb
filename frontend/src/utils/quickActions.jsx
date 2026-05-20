import {
  Banknote,
  FolderPlus,
  Landmark,
  ReceiptText,
  Tags,
} from "lucide-react";

export const creationActionMeta = {
  gasto: {
    accent: "primary",
    actionLabel: "Cargar ahora",
    description: "Registra un movimiento diario. Luego lo haremos pendiente y con factura.",
    icon: <ReceiptText size={24} />,
    title: "Crear Gasto",
  },
  categoriasGrupo: {
    actionLabel: "Crear",
    description: "Ordena tus gastos por grupos faciles de entender.",
    icon: <FolderPlus size={24} />,
    title: "Crear Categoria Principal",
  },
  categorias: {
    actionLabel: "Crear",
    description: "Clasifica movimientos con menos dudas al cargar.",
    icon: <Tags size={24} />,
    title: "Crear Subcategoria",
  },
  bancos: {
    actionLabel: "Crear",
    description: "Agrega la institucion donde tenes tus cuentas.",
    icon: <Landmark size={24} />,
    title: "Crear Banco",
  },
  cuentas: {
    actionLabel: "Crear",
    description: "Vincula una cuenta para consultar gastos por origen.",
    icon: <Banknote size={24} />,
    title: "Crear Cuenta",
  },
};

export const quickActionOrder = [
  "gasto",
  "categoriasGrupo",
  "categorias",
  "bancos",
  "cuentas",
];

export function buildQuickActions(handlers, options = {}) {
  const { activeKey = "" } = options;

  return quickActionOrder.map((key) => ({
    ...creationActionMeta[key],
    accent:
      creationActionMeta[key].accent || (activeKey === key ? "primary" : "neutral"),
    onClick: handlers[key],
  }));
}
