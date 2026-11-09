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

GPU가 포함된 Sankey 그래프는 **목적지별 유입 인원 상위 5종 + 나머지 GPU**를 기본으로 표시합니다. 예를 들어 `상옵`으로 연결된 GPU 중 5종, `중옵`으로 연결된 GPU 중 5종을 독립적으로 선정합니다. 같은 GPU라도 도착하는 목적지가 다르면 별도의 노드로 나타나며 `기타 GPU`도 목적지마다 따로 합산합니다. 실제 GPU 종류가 5개 이하인 목적지는 있는 모델만 표시합니다. 그래프 위 `GPU 표시`에서 **원본 전체 흐름 (모든 GPU)**를 선택하면 기존 HMD/콘텐츠/제조사 → GPU → 결과 전체 흐름을 볼 수 있습니다.

기본 목적지별 5종 보기에서는 GPU→결과의 **검증 가능한 인접 단계 연결만** 그립니다. 앞선 HMD·콘텐츠가 어느 결과로 연결되는지 전체 개인 경로를 임의로 추정하지 않습니다. 각 결과의 인원 합계는 유지되고, CSV에는 현재 필터에 해당하는 GPU별 원본 연결 데이터가 그대로 들어갑니다. 노드·연결선 클릭 강조 및 항목 바로 찾기 기능도 유지됩니다.

그래프 빈 공간을 마우스로 드래그해 이동하고 `Ctrl + 마우스 휠`로 확대·축소합니다. 일반 휠은 스크롤로 유지됩니다. 연결표의 행도 키보드로 선택할 수 있습니다. CSV 버튼은 화면의 GPU 묶음과 관계없이 필터별 원본 연결을 저장합니다.

- Sankey UI 테스트: `node scripts/verify-sankey.mjs`
