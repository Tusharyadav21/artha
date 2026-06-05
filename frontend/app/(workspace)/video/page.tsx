import { redirect } from "next/navigation"

// Video generation is not available in this release.
export default function VideoPage() {
  redirect("/chat")
}
