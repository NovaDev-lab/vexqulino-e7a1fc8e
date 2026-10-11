<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- AI chat calls go through Lovable AI Gateway in src/routes/api/chat.ts, routed by a `provider` field (Claude via native Messages, Gemini via Chat Completions, OpenAI via Responses); why: no user-supplied keys and each vendor uses its documented protocol.
- Image generation goes through src/routes/api/image.ts (Gemini/ChatGPT only), streamed SSE to the client; chat history is kept in browser localStorage; why: no accounts in this app, so history stays per-device.
