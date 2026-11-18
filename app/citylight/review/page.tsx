import { redirect } from 'next/navigation';

// Same-project static evidence also works offline. No 3D, TTS or try-on API initializes here.
export default function CitylightReviewPage() {
  redirect('/citylight-review-v5/index.html');
}
