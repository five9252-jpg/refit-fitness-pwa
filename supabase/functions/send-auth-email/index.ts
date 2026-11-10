import { Webhook } from 'npm:standardwebhooks@^1';

type User = { email?: string; new_email?: string };
type EmailData = {
  token?: string;
  token_hash?: string;
  token_new?: string;
  token_hash_new?: string;
  redirect_to?: string;
  email_action_type?: string;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]!));
}

function verificationUrl(tokenHash: string, action: string, redirectTo: string) {
  const url = new URL('https://hoxkpuyaeyojxhchtwzg.supabase.co/auth/v1/verify');
  url.searchParams.set('token', tokenHash);
  url.searchParams.set('type', action);
  if (redirectTo) url.searchParams.set('redirect_to', redirectTo);
  return url.toString();
}

function template(action: string, link: string, token?: string) {
  const content: Record<string, { subject: string; title: string; description: string; cta: string }> = {
    signup: { subject: '페이스핏 이메일 인증', title: '가입을 완료해 주세요', description: '아래 버튼을 눌러 이메일 주소를 확인해 주세요.', cta: '이메일 인증하기' },
    invite: { subject: '페이스핏 초대 안내', title: '페이스핏에 초대됐어요', description: '아래 버튼을 눌러 초대를 확인해 주세요.', cta: '초대 확인하기' },
    recovery: { subject: '페이스핏 비밀번호 재설정', title: '비밀번호를 재설정해 주세요', description: '아래 버튼을 눌러 비밀번호 재설정을 진행해 주세요.', cta: '비밀번호 재설정' },
    magiclink: { subject: '페이스핏 로그인 링크', title: '로그인 링크를 보냅니다', description: '아래 버튼을 눌러 페이스핏에 로그인해 주세요.', cta: '로그인하기' },
    email_change: { subject: '페이스핏 이메일 변경 확인', title: '이메일 변경을 확인해 주세요', description: '아래 버튼을 눌러 이메일 변경을 확인해 주세요.', cta: '변경 확인하기' },
    reauthentication: { subject: '페이스핏 본인 확인', title: '요청을 확인해 주세요', description: '아래 버튼을 눌러 본인 확인을 완료해 주세요.', cta: '확인하기' },
  };
  const item = content[action];
  if (!item) throw new Error('Unsupported authentication email action');
  const safeLink = escapeHtml(link);
  const signupCode = action === 'signup' && token && /^[0-9]{6,8}$/.test(token) ? token : '';
  const codeHtml = signupCode ? `<p>페이스핏 가입 화면에 아래 인증번호를 입력해도 됩니다.</p><p style="font-size:28px;font-weight:800;letter-spacing:5px">${signupCode}</p>` : '';
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><body style="margin:0;background:#f4f6f2;font-family:Arial,sans-serif;color:#19352a"><main style="max-width:520px;margin:32px auto;padding:32px;background:#fff;border-radius:18px"><p style="font-weight:700;color:#315f49">페이스핏</p><h1 style="font-size:24px">${item.title}</h1><p style="line-height:1.7">${item.description}</p>${codeHtml}<p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#315f49;color:white;text-decoration:none;font-weight:700">${item.cta}</a></p><p style="font-size:13px;color:#62736a">요청한 적이 없다면 이 메일을 무시해 주세요. 인증번호와 링크는 다른 사람과 공유하지 마세요.</p></main></body></html>`;
  return { subject: item.subject, html, text: `${item.title}\n\n${item.description}${signupCode?`\n\n가입 인증번호: ${signupCode}`:''}\n\n${item.cta}: ${link}\n\n요청한 적이 없다면 이 메일을 무시해 주세요.` };
}

async function sendEmail(to: string, action: string, tokenHash: string, redirectTo: string, apiKey: string, from: string, token?: string) {
  if (!to || !tokenHash) throw new Error('Missing recipient or verification token');
  const message = template(action, verificationUrl(tokenHash, action, redirectTo), token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], ...message }),
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`Resend request failed (${response.status})`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const rawSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
  const from = Deno.env.get('PACEFIT_AUTH_FROM');
  if (!apiKey || !rawSecret || !from) return json({ error: 'Email provider is not configured' }, 503);

  const rawBody = await req.text();
  if (rawBody.length > 64_000) return json({ error: 'Payload too large' }, 413);
  try {
    const secret = rawSecret.replace(/^v1,whsec_/, '');
    const event = new Webhook(secret).verify(rawBody, Object.fromEntries(req.headers)) as {
      user?: User;
      email_data?: EmailData;
      email?: EmailData;
    };
    const user = event.user ?? {};
    const data = event.email_data ?? event.email ?? {};
    const action = data.email_action_type ?? '';
    const redirectTo = data.redirect_to ?? '';

    if (action === 'email_change') {
      const oldPair = user.email && data.token_hash_new
        ? { to: user.email, hash: data.token_hash_new }
        : null;
      const newPair = user.new_email && data.token_hash
        ? { to: user.new_email, hash: data.token_hash }
        : null;
      const singlePair = !oldPair && user.new_email && data.token_hash
        ? { to: user.new_email, hash: data.token_hash }
        : null;
      const deliveries = [oldPair, newPair].filter((item): item is { to: string; hash: string } => Boolean(item));
      if (!deliveries.length && singlePair) deliveries.push(singlePair);
      if (!deliveries.length) throw new Error('Missing email-change token data');
      await Promise.all(deliveries.map((item) => sendEmail(item.to, action, item.hash, redirectTo, apiKey, from)));
    } else {
      const recipient = user.email;
      const tokenHash = data.token_hash;
      if (!recipient || !tokenHash) throw new Error('Missing authentication email data');
      await sendEmail(recipient, action, tokenHash, redirectTo, apiKey, from, data.token);
    }
    return json({});
  } catch {
    // Do not log webhook payloads, email addresses, tokens, or provider credentials.
    return json({ error: 'Authentication email could not be sent' }, 400);
  }
});
