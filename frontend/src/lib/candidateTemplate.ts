import type { AdminPollOptionInput } from './adminPollInput'
import { ROSTER_IMAGE_URLS } from './images'

// 새 투표 만들기의 기본 템플릿. 매번 처음부터 입력하지 않도록, 슬램덩크 투표(poll_id=1)의
// 실제 후보 8명 값을 그대로 채워서 시작하고, 필요하면 관리자가 자유롭게 수정/삭제/추가한다.
export const DEFAULT_CANDIDATE_TEMPLATE: AdminPollOptionInput[] = [
  { name: '강백호', team: '북산 · PF', imageUrl: ROSTER_IMAGE_URLS[0] },
  { name: '서태웅', team: '북산 · SF', imageUrl: ROSTER_IMAGE_URLS[1] },
  { name: '정대만', team: '북산 · SG', imageUrl: ROSTER_IMAGE_URLS[2] },
  { name: '송태섭', team: '북산 · PG', imageUrl: ROSTER_IMAGE_URLS[3] },
  { name: '채치수', team: '북산 · C', imageUrl: ROSTER_IMAGE_URLS[4] },
  {
    name: '윤대협',
    team: '능남 · SF',
    imageUrl:
      ROSTER_IMAGE_URLS[5],
  },
  {
    name: '이정환',
    team: '해남 · PG',
    imageUrl: ROSTER_IMAGE_URLS[6],
  },
  {
    name: '권준호',
    team: '북산 · SF',
    imageUrl: ROSTER_IMAGE_URLS[7],
  },
]
