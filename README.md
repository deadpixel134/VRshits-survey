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

GPU가 포함된 Sankey 그래프는 **모든 GPU 모델과 원래 단계별 연결을 기본으로 표시**합니다. GPU 모델을 임의로 분리하거나 목적지별로 노드를 복제하지 않습니다. `GPU 표시` 메뉴에서만 **상위 12종 + 기타** 또는 **상위 20종 + 기타**로 축약할 수 있습니다. 축약은 GPU의 전체 사용 인원을 기준으로 선정하며, 원본 단계·연결 관계와 단계별 인원 합계를 유지합니다.

상단의 `현재 도표 분모 n=…` 설명 영역은 표시하지 않습니다. `원본 CSV`에는 선택한 콘텐츠 필터의 세부 연결 데이터가 축약 없이 담깁니다. 노드·연결선 강조와 항목 바로 찾기는 유지됩니다.

그래프 빈 공간을 마우스로 드래그해 이동하고 `Ctrl + 마우스 휠`로 확대·축소합니다. 일반 휠은 스크롤로 유지됩니다. 연결표의 행도 키보드로 선택할 수 있습니다. CSV 버튼은 화면의 GPU 묶음과 관계없이 필터별 원본 연결을 저장합니다.

- Sankey UI 테스트: `node scripts/verify-sankey.mjs`
