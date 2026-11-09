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

## Sankey 그래프 탐색

Sankey 그래프의 GPU 모델은 기본적으로 응답이 많은 상위 12종과 나머지 묶음을 보여줍니다. 그래프 위 `GPU 표시` 메뉴에서 상위 20종이나 전체 모델로 변경할 수 있습니다. 노드·연결선을 선택하면 관련 흐름이 강조되고, 항목 검색 메뉴로 원하는 노드에 바로 이동할 수 있습니다.

그래프 빈 공간을 마우스로 드래그해 이동하고 `Ctrl + 마우스 휠`로 확대·축소합니다. 일반 휠은 스크롤로 유지됩니다. 연결표의 행도 키보드로 선택할 수 있습니다. CSV 버튼은 화면의 GPU 묶음과 관계없이 필터별 원본 연결을 저장합니다.

- Sankey UI 테스트: `node scripts/verify-sankey.mjs`
