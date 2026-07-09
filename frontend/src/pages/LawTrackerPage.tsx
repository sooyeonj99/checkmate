import { useState } from 'react'

const SAMPLE_LAWS = [
  { id: 1, name: '근로기준법', lastChanged: '2024-10-01', changeType: '개정', summary: '연장근로 한도 및 휴가 규정 변경', relevance: '근로계약서' },
  { id: 2, name: '주택임대차보호법', lastChanged: '2024-07-15', changeType: '개정', summary: '계약갱신청구권 및 전월세 상한제 조항 수정', relevance: '임대차계약서' },
  { id: 3, name: '전자상거래법', lastChanged: '2024-09-20', changeType: '개정', summary: '온라인 플랫폼 사업자 의무 강화', relevance: '서비스이용계약' },
  { id: 4, name: '하도급거래공정화법', lastChanged: '2024-06-01', changeType: '개정', summary: '서면 계약 의무화 범위 확대', relevance: '하도급계약서' },
]

const CATEGORIES = ['전체', '근로', '임대차', '상사', '프랜차이즈', '전자상거래']

export default function LawTrackerPage() {
  const [category, setCategory] = useState('전체')
  const [keyword, setKeyword] = useState('')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      paddingTop: 80,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 32 }}>⚖️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>법령 변경 추적</h1>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
                }}>준비중</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                계약서에 관련된 법령 개정을 자동으로 추적하고 알려드립니다
              </p>
            </div>
          </div>

          {/* 준비중 배너 */}
          <div style={{
            background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)',
            borderRadius: 14, padding: '18px 22px',
            display: 'flex', alignItems: 'flex-start', gap: 14,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🔔</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#2563eb', marginBottom: 6 }}>국가법령정보공단 API 연동 예정</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                현재 샘플 데이터로 UI를 미리 보여드립니다. 정식 오픈 시 law.go.kr 법제처 API와 연동되어
                실시간 법령 개정 알림 및 계약서 영향도 분석이 제공됩니다.
              </div>
            </div>
          </div>
        </div>

        {/* 검색 + 카테고리 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="법령명 또는 계약서 유형 검색..."
            style={{
              padding: '12px 18px', borderRadius: 12, fontSize: 14,
              background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: category === c ? '#2563eb' : 'var(--bg-card)',
                color: category === c ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${category === c ? '#2563eb' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 법령 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SAMPLE_LAWS
            .filter(l => !keyword || l.name.includes(keyword) || l.relevance.includes(keyword))
            .map(law => (
              <div key={law.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 22,
                display: 'flex', gap: 18, alignItems: 'flex-start',
              }}>
                {/* 날짜 */}
                <div style={{ textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {law.lastChanged.slice(0, 7)}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                    background: 'rgba(37,99,235,0.1)', color: '#2563eb',
                  }}>{law.changeType}</div>
                </div>

                {/* 내용 */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{law.name}</span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 8,
                      background: 'rgba(124,58,237,0.1)', color: '#7c3aed', fontWeight: 700,
                    }}>관련: {law.relevance}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                    {law.summary}
                  </p>
                </div>

                {/* 준비중 버튼 */}
                <button style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: 'rgba(100,116,139,0.08)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', cursor: 'not-allowed', flexShrink: 0,
                }}>
                  상세보기
                </button>
              </div>
            ))}
        </div>

        {/* 예정 기능 */}
        <div style={{ marginTop: 40, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 18 }}>📋 정식 오픈 시 제공 기능</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[
              { icon: '🔔', title: '실시간 알림', desc: '분석한 계약서와 관련된 법령이 개정되면 즉시 알림' },
              { icon: '📊', title: '영향도 분석', desc: '내 계약서에 개정 법령이 미치는 영향을 AI가 분석' },
              { icon: '📅', title: '시행일 추적', desc: '개정 예정 법령의 시행일을 미리 캘린더에 등록' },
              { icon: '🔍', title: '법령 검색', desc: '계약 유형별 관련 법령 전문 검색 및 조항 북마크' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22 }}>{f.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
