export default function handler(req: any, res: any) {
  return res.status(200).json({
    status: 'ok',
    service: 'ReFound API on Vercel',
    time: new Date().toISOString(),
  });
}
