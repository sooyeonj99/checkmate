import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-header">
        <Link to="/" className="legal-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7V12C3 16.97 6.84 21.61 12 23C17.16 21.61 21 16.97 21 12V7L12 2Z" fill="white" fillOpacity="0.9"/>
            <path d="M9 12L11 14L15 10" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>CHECKMATE</span>
        </Link>
        <Link to="/auth" className="legal-back">← 돌아가기</Link>
      </div>

      <div className="legal-container">
        <div className="legal-doc">
          <div className="legal-title-block">
            <h1 className="legal-title">이용약관</h1>
            <p className="legal-effective">시행일: 2026년 06월 23일 | 최종 수정: 2026년 06월 23일</p>
          </div>

          <div className="legal-intro">
            체크메이트(이하 "회사")가 제공하는 AI 계약서 분석 서비스(이하 "서비스")를 이용해 주셔서 감사합니다.
            본 약관은 회사와 이용자 간의 서비스 이용에 관한 권리, 의무 및 책임사항, 기타 필요한 사항을 규정합니다.
            서비스를 이용하기 전 본 약관을 주의 깊게 읽어 주시기 바랍니다.
          </div>

          <Section title="제1조 (목적)">
            본 약관은 체크메이트(이하 "회사")가 운영하는 체크메이트 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항, 서비스 이용조건 및 절차 등 기본적인 사항을 규정함을 목적으로 합니다.
          </Section>

          <Section title="제2조 (정의)">
            <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ol>
              <li><strong>"서비스"</strong>란 회사가 제공하는 AI 기반 계약서 분석, 위험 조항 탐지, 구독·렌탈 비용 관리 등의 모든 기능을 의미합니다.</li>
              <li><strong>"이용자"</strong>란 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 의미합니다.</li>
              <li><strong>"회원"</strong>이란 회사에 개인정보를 제공하고 회원으로 등록한 자를 의미합니다.</li>
              <li><strong>"계정"</strong>이란 회원이 서비스에 접근하기 위해 사용하는 이메일 주소와 비밀번호의 조합을 의미합니다.</li>
              <li><strong>"콘텐츠"</strong>란 이용자가 서비스에 업로드하는 계약서 파일, 텍스트 등 모든 정보를 의미합니다.</li>
              <li><strong>"AI 분석 결과"</strong>란 회사의 인공지능 시스템이 계약서를 분석하여 제공하는 위험도 점수, 조항 해석, 수정 제안 등의 결과물을 의미합니다.</li>
            </ol>
          </Section>

          <Section title="제3조 (약관의 효력 및 변경)">
            <ol>
              <li>본 약관은 서비스 화면에 게시하거나 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령에 위반하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
              <li>회사가 약관을 개정할 경우, 개정 내용과 시행일을 명시하여 시행일로부터 최소 7일 전에 공지합니다. 단, 이용자에게 불리한 내용을 변경하는 경우에는 최소 30일 전에 공지합니다.</li>
              <li>이용자는 개정된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 회원 탈퇴를 할 수 있습니다. 공지 후에도 서비스를 계속 이용하는 경우 개정 약관에 동의한 것으로 간주합니다.</li>
            </ol>
          </Section>

          <Section title="제4조 (회원가입)">
            <ol>
              <li>서비스 이용을 희망하는 자는 회사가 정한 절차에 따라 회원가입을 신청할 수 있습니다.</li>
              <li>회원가입 신청자는 본 약관 및 개인정보처리방침에 동의함으로써 회원가입을 신청할 수 있습니다.</li>
              <li>회사는 다음 각 호에 해당하는 경우 회원가입 신청을 거부하거나 취소할 수 있습니다.
                <ul>
                  <li>타인의 명의를 도용하거나 허위 정보를 기재한 경우</li>
                  <li>만 14세 미만인 경우</li>
                  <li>이전에 서비스 이용자격 상실 처리를 받은 경우</li>
                  <li>기타 회사가 정한 이용신청 요건을 충족하지 않은 경우</li>
                </ul>
              </li>
              <li>회원은 가입 시 등록한 정보에 변경이 있을 경우 즉시 수정해야 하며, 변경 미이행으로 발생한 손해에 대해 회사는 책임을 지지 않습니다.</li>
            </ol>
          </Section>

          <Section title="제5조 (서비스의 제공 및 변경)">
            <ol>
              <li>회사는 다음과 같은 서비스를 제공합니다.
                <ul>
                  <li>AI 기반 계약서 분석 및 위험 조항 탐지</li>
                  <li>계약서 위험도 점수 및 등급 산출</li>
                  <li>계약 조항 수정 제안</li>
                  <li>계약서 이력 관리 대시보드</li>
                  <li>구독·렌탈 계약 비용 및 위약금 관리</li>
                  <li>계약 만료일 알림</li>
                  <li>AI 계약서 상담 챗봇</li>
                </ul>
              </li>
              <li>서비스는 연중무휴 24시간 제공을 원칙으로 합니다. 단, 시스템 점검·장애·통신 장애 등 불가피한 사유로 서비스가 일시 중단될 수 있습니다.</li>
              <li>회사는 서비스 내용을 변경하거나 종료할 수 있으며, 이 경우 30일 전에 이용자에게 공지합니다.</li>
            </ol>
          </Section>

          <Section title="제6조 (이용자의 의무)">
            <ol>
              <li>이용자는 다음 각 호의 행위를 해서는 안 됩니다.
                <ul>
                  <li>타인의 정보 도용</li>
                  <li>회사가 게시한 정보의 무단 변경</li>
                  <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 송신 또는 게시</li>
                  <li>회사 또는 제3자의 저작권 등 지적재산권 침해</li>
                  <li>회사 또는 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                  <li>서비스를 이용하여 법령 또는 공서양속에 반하는 행위</li>
                  <li>자동화된 수단을 통한 서비스 무단 접근 또는 스크래핑</li>
                </ul>
              </li>
              <li>이용자는 서비스에 업로드하는 계약서에 대한 정당한 권한이 있음을 보증합니다.</li>
              <li>이용자는 계정 정보를 안전하게 관리해야 하며, 계정 도용 또는 부정 사용 발생 시 즉시 회사에 통보해야 합니다.</li>
            </ol>
          </Section>

          <Section title="제7조 (AI 분석 결과의 법적 한계)">
            <Highlight>
              <ol>
                <li>본 서비스가 제공하는 AI 분석 결과는 정보 제공을 목적으로 하며, <strong>법적 효력이 없습니다.</strong></li>
                <li>AI 분석 결과는 법률 전문가의 법적 조언을 대체하지 않습니다. 계약서의 법적 해석 및 조언을 위해서는 반드시 자격을 갖춘 변호사 또는 법률 전문가와 상담하시기 바랍니다.</li>
                <li>회사는 AI 분석 결과의 정확성, 완전성, 적시성을 보장하지 않으며, 분석 결과에 기반한 의사결정으로 인한 손해에 대해 책임을 지지 않습니다.</li>
                <li>동일한 계약서라도 분석 시점, 모델 버전에 따라 결과가 다를 수 있습니다.</li>
              </ol>
            </Highlight>
          </Section>

          <Section title="제8조 (저작권 및 지적재산권)">
            <ol>
              <li>서비스 및 서비스 내 모든 콘텐츠(로고, UI, 텍스트, 소프트웨어 등)에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.</li>
              <li>이용자가 서비스에 업로드한 계약서 파일의 저작권은 이용자 또는 해당 저작권자에게 귀속됩니다. 회사는 서비스 제공 목적 외에 이용자의 파일을 사용하지 않습니다.</li>
              <li>이용자는 회사의 명시적 허가 없이 서비스의 전부 또는 일부를 복제, 수정, 배포, 판매, 재라이선스 하거나 파생 저작물을 생성해서는 안 됩니다.</li>
            </ol>
          </Section>

          <Section title="제9조 (개인정보 보호)">
            <ol>
              <li>회사는 「개인정보 보호법」 및 관련 법령을 준수하여 이용자의 개인정보를 보호합니다.</li>
              <li>개인정보 수집·이용·보관 등에 관한 상세한 사항은 별도의 <Link to="/privacy" className="legal-inline-link">개인정보처리방침</Link>에 따릅니다.</li>
            </ol>
          </Section>

          <Section title="제10조 (업로드 파일 처리)">
            <ol>
              <li>이용자가 업로드한 계약서 파일은 AI 분석 완료 후 서버에서 즉시 삭제됩니다.</li>
              <li>회사는 업로드된 계약서 내용을 저장·공유·AI 학습에 사용하지 않습니다.</li>
              <li>분석 결과(위험도 점수, 조항 요약 등)는 이용자의 대시보드에서 확인할 수 있도록 보관되며, 이용자가 삭제 요청 시 즉시 삭제됩니다.</li>
            </ol>
          </Section>

          <Section title="제11조 (서비스 이용 제한)">
            <ol>
              <li>회사는 이용자가 본 약관을 위반하거나 다음 각 호에 해당하는 경우 서비스 이용을 제한할 수 있습니다.
                <ul>
                  <li>타인의 개인정보를 도용한 경우</li>
                  <li>서비스의 정상적인 운영을 방해한 경우</li>
                  <li>불법적인 목적으로 서비스를 이용한 경우</li>
                  <li>1회 무료 이용 한도 초과 등 요금제 위반</li>
                </ul>
              </li>
              <li>서비스 이용 제한 시 회사는 사전에 이메일 등으로 통보하며, 긴급한 경우 즉시 제한 후 통보할 수 있습니다.</li>
            </ol>
          </Section>

          <Section title="제12조 (면책조항)">
            <ol>
              <li>회사는 천재지변, 전쟁, 테러, 해킹 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
              <li>회사는 이용자가 서비스에 게재한 정보, 자료 등의 신뢰도, 정확성 등에 대해 책임을 지지 않습니다.</li>
              <li>회사의 손해배상 책임은 관련 법령이 허용하는 최대 범위 내에서 이용자가 지불한 최근 3개월 이용요금을 한도로 합니다.</li>
            </ol>
          </Section>

          <Section title="제13조 (준거법 및 분쟁 해결)">
            <ol>
              <li>본 약관의 해석 및 이에 따른 분쟁 해결은 대한민국 법률에 따릅니다.</li>
              <li>서비스 이용과 관련한 분쟁은 회사와 이용자가 성실하게 협의하여 해결합니다.</li>
              <li>협의가 이루어지지 않는 경우, 민사소송법상 관할법원에 소를 제기할 수 있습니다.</li>
            </ol>
          </Section>

          <div className="legal-footer-box">
            <p><strong>체크메이트 (CHECKMATE)</strong></p>
            <p>서비스 문의: support@checkmate.kr</p>
            <p>본 약관은 2026년 06월 23일부터 시행됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="legal-section">
      <h2 className="legal-section-title">{title}</h2>
      <div className="legal-section-body">{children}</div>
    </div>
  )
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <div className="legal-highlight">{children}</div>
}
