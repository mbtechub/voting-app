import { proxyToBackend } from '@/lib/proxy';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ electionId: string }> }
) {
  const { electionId } = await ctx.params;

  const res = await proxyToBackend(
    `/api/public/elections/${electionId}/candidates`,
    req,
    { requireAdmin: false }
  );

  const data = await res.json().catch(() => null);

  if (!Array.isArray(data)) {
    return Response.json(data, { status: res.status });
  }

  const normalized = data.map((c: any) => {
    const photo =
      c.photoUrl ??
      c.photo_url ??
      c.PHOTO_URL ??
      null;

    return {
      candidateId:
        c.candidateId ??
        c.candidate_id ??
        c.CANDIDATE_ID,

      electionId:
        c.electionId ??
        c.election_id ??
        c.ELECTION_ID,

      name:
        c.name ??
        c.NAME ??
        '',

      votePrice:
        c.votePrice ??
        c.vote_price ??
        c.VOTE_PRICE ??
        null,

      // ✅ VERY IMPORTANT: DO NOT TOUCH EXTERNAL URLs
      photoUrl:
        typeof photo === 'string' && photo.trim() !== ''
          ? photo
          : null,
    };
  });

  return Response.json(normalized, { status: res.status });
}