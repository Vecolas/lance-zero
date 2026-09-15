# Vercel Production Reference

Useful official pages:
- Next.js on Vercel: https://vercel.com/docs/frameworks/full-stack/nextjs
- Headers: https://vercel.com/docs/headers
- Security: https://vercel.com/security
- WAF: https://vercel.com/security/web-application-firewall
- Deployment Protection: https://vercel.com/kb/deployment-protection

## Important security precedent

The May 2026 Next.js coordinated security release included:
- middleware/proxy auth bypass;
- SSRF;
- cache poisoning;
- XSS.

Patching was the complete mitigation for several advisories.

Implication:
- keep framework patched;
- authorization close to data;
- do not assume WAF replaces framework patches.
