import { useContext } from "react";
import { DatasetContext, type DatasetContextValue } from "@/context/DatasetContext";

export type UseDatasetReturn = DatasetContextValue;

/** Shared dataset state. Must be used inside <DatasetProvider>. */
export function useDataset(): UseDatasetReturn {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error("useDataset must be used inside a DatasetProvider");
  }
  return context;
}
