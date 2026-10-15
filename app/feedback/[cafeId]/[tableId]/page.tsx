import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ cafeId: string; tableId: string }>;
};

export default async function TableFeedbackRoute({ params }: Props) {
  const { cafeId } = await params;
  redirect(`/c/${encodeURIComponent(cafeId)}`);
}
