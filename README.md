# 가현챈 XR 설문 2025–2026

GitHub Pages 배포: Settings → Pages → Deploy from a branch → main /docs → Save.
일반 분석: index.html / 상세 분석: index.html#detailed / Sankey: sankey.html / 게시용 HTML: community.html.

공개 파일은 집계값과 보고서만 포함합니다. 개인별 응답·타임스탬프·자유응답 원문은 포함하지 않습니다.

## 웹사이트 검증

- GitHub Actions: [Verify XR survey website](https://github.com/deadpixel134/VRshits-survey/actions/workflows/verify-site.yml)
- 로컬 실행: `node scripts/verify-site.mjs`
- 자바스크립트 문법 확인: `node --check docs/site.js`, `node --check docs/sankey.js`, `node --check docs/community.js`, `node --check docs/data.js`
- 검증 범위: 정적 파일 및 PNG 존재, 내부 링크·앵커, 일반/상세 해석 연결, 게시용 HTML 데이터, Sankey 데이터 구성

이 자동 검증은 정적 파일 검사이며 실제 브라우저 렌더링과 GitHub Pages 배포 성공 여부를 보장하지 않습니다. 배포 상태는 [Pages 설정](https://github.com/deadpixel134/VRshits-survey/settings/pages)에서 확인합니다.
