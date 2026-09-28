import { notFound } from "next/navigation";
import DesignSystemGallery from "@/features/design-system/design-system-gallery";
export default function ComponentGallery() {
  if (process.env.ENABLE_COMPONENT_GALLERY !== "true") notFound();
  return <DesignSystemGallery />;
}
