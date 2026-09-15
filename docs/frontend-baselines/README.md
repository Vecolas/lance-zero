# Baselines visuais do frontend

Estas imagens são referências humanas capturadas pelo teste
`tests/e2e/frontend-visual.spec.ts`; não são golden snapshots pixel-a-pixel.

Para regenerar as réguas obrigatórias:

```powershell
$env:SAVE_FRONTEND_BASELINES = '1'
pnpm exec playwright test tests/e2e/frontend-visual.spec.ts --project=desktop --workers=1
Remove-Item Env:SAVE_FRONTEND_BASELINES
```

As dimensões cobertas são 360×800, 768×1024, 1280×800 e 1440×900. O mesmo
teste verifica overflow horizontal, `main`, H1 e os fluxos de abertura/final.
