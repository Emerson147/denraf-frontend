#!/bin/bash

echo "🚀 Building production bundle..."
ng build --configuration=production

echo ""
echo "✅ Build completed!"
echo ""
echo "📊 Bundle size:"
ls -lh dist/sistema-master/browser/ | grep -E "\.js$|\.css$"

echo ""
echo "📦 Total bundle size:"
du -sh dist/sistema-master/browser/

echo ""
echo "🌐 Para servir en local y testear con Lighthouse:"
echo "   npx http-server dist/sistema-master/browser -p 8080"
echo ""
echo "   Luego abre: http://localhost:8080"
echo "   Y ejecuta Lighthouse en modo incógnito"
