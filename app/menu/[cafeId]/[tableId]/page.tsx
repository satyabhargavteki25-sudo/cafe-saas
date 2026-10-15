import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ cafeId: string; tableId: string }>;
};

export default async function TableMenuRoute({ params }: Props) {
  const { cafeId } = await params;
  redirect(`/menu/${encodeURIComponent(cafeId)}`);
}
