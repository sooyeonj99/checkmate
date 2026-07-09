import { Link } from 'react-router-dom'

export default function PrivacyPage() {
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
 <h1 className="legal-title">개인정보처리방침</h1>
 <p className="legal-effective">시행일: 2026년 06월 23일 | 최종 수정: 2026년 06월 23일</p>
 </div>

 <div className="legal-intro">
 체크메이트(이하 "회사")는 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령에 따라
 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
 </div>

 <Section title="제1조 (개인정보의 처리 목적)">
 <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
 <table className="legal-table">
 <thead>
 <tr><th>처리 목적</th><th>세부 내용</th></tr>
 </thead>
 <tbody>
 <tr><td>회원 가입 및 관리</td><td>본인 확인, 회원 자격 유지·관리, 서비스 부정이용 방지</td></tr>
 <tr><td>서비스 제공</td><td>계약서 AI 분석 기능 제공, 분석 이력 저장, 대시보드 운영</td></tr>
 <tr><td>고객 지원</td><td>민원 처리, 불만 처리, 공지사항 전달</td></tr>
 <tr><td>서비스 개선</td><td>접속 빈도 파악, 서비스 이용통계 분석 (비식별화 처리 후)</td></tr>
 <tr><td>마케팅 및 광고</td><td>신규 서비스 안내, 이벤트 정보 제공 (동의한 경우에 한함)</td></tr>
 </tbody>
 </table>
 </Section>

 <Section title="제2조 (처리하는 개인정보 항목)">
 <p>회사는 다음과 같은 개인정보 항목을 수집·처리합니다.</p>

 <h3 className="legal-sub-title">① 필수 수집 항목 (회원가입)</h3>
 <ul>
 <li>이메일 주소, 이름(닉네임), 비밀번호(암호화 저장)</li>
 <li>서비스 이용일시, 접속 IP 주소</li>
 </ul>

 <h3 className="legal-sub-title">② 서비스 이용 중 자동 생성 정보</h3>
 <ul>
 <li>서비스 이용 기록, 접속 로그, 쿠키</li>
 <li>계약서 분석 결과 (위험도 점수, 조항 요약) — 원본 파일은 분석 완료 즉시 삭제</li>
 </ul>

 <h3 className="legal-sub-title">③ 유료 서비스 이용 시 (해당 시)</h3>
 <ul>
 <li>결제 정보 (카드사, 결제 승인번호 — 카드번호 전체는 수집하지 않음)</li>
 </ul>

 <div className="legal-highlight">
 <strong> 계약서 원본 파일은 수집하지 않습니다.</strong><br />
 업로드된 계약서 파일은 AI 분석 과정에만 일시적으로 사용되며, 분석 완료 즉시 서버에서 영구 삭제됩니다.
 계약서 내용은 저장·공유·AI 학습에 사용되지 않습니다.
 </div>
 </Section>

 <Section title="제3조 (개인정보의 처리 및 보유 기간)">
 <table className="legal-table">
 <thead>
 <tr><th>항목</th><th>보유 기간</th><th>근거</th></tr>
 </thead>
 <tbody>
 <tr><td>회원 가입 정보</td><td>회원 탈퇴 시까지</td><td>이용자 동의</td></tr>
 <tr><td>서비스 이용 기록</td><td>3년</td><td>통신비밀보호법</td></tr>
 <tr><td>전자상거래 기록</td><td>5년</td><td>전자상거래 등에서의 소비자보호에 관한 법률</td></tr>
 <tr><td>소비자 불만·분쟁 기록</td><td>3년</td><td>전자상거래 등에서의 소비자보호에 관한 법률</td></tr>
 <tr><td>계약서 원본 파일</td><td>분석 완료 즉시 삭제</td><td>회사 내부 정책</td></tr>
 <tr><td>계약서 분석 결과</td><td>회원 삭제 요청 시 또는 탈퇴 시</td><td>이용자 동의</td></tr>
 </tbody>
 </table>
 </Section>

 <Section title="제4조 (개인정보의 제3자 제공)">
 <ol>
 <li>회사는 이용자의 개인정보를 제1조에서 명시한 목적 범위 내에서만 처리하며, 이용자의 동의 없이 제3자에게 제공하지 않습니다.</li>
 <li>다음의 경우에는 예외적으로 개인정보를 제공할 수 있습니다.
 <ul>
 <li>이용자가 사전에 동의한 경우</li>
 <li>법령에 특별한 규정이 있거나 법령상 의무를 준수하기 위해 불가피한 경우</li>
 <li>수사기관이 범죄 수사를 위해 법령에 정한 절차와 방법에 따라 요청한 경우</li>
 </ul>
 </li>
 </ol>
 </Section>

 <Section title="제5조 (개인정보 처리 위탁)">
 <p>회사는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
 <table className="legal-table">
 <thead>
 <tr><th>수탁업체</th><th>위탁 업무 내용</th><th>보유 기간</th></tr>
 </thead>
 <tbody>
 <tr><td>Google LLC (Gemini API)</td><td>계약서 AI 분석 처리 (원문 비저장)</td><td>처리 완료 즉시 삭제</td></tr>
 <tr><td>클라우드 서비스 제공업체</td><td>서버 운영 및 데이터 보관</td><td>위탁 계약 종료 시까지</td></tr>
 </tbody>
 </table>
 <p style={{marginTop: 12}}>회사는 위탁 계약 시 개인정보보호 관련 법규의 준수 및 개인정보의 안전한 관리를 위한 사항을 계약서에 명시하고 이를 감독합니다.</p>
 </Section>

 <Section title="제6조 (정보주체의 권리·의무 및 행사 방법)">
 <ol>
 <li>이용자는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
 <ul>
 <li>개인정보 열람 요구</li>
 <li>오류 등이 있을 경우 정정 요구</li>
 <li>삭제 요구</li>
 <li>처리정지 요구</li>
 </ul>
 </li>
 <li>권리 행사는 서비스 내 계정 설정 페이지 또는 이메일(support@checkmate.kr)을 통해 요청할 수 있으며, 회사는 10일 이내에 조치 결과를 알려드립니다.</li>
 <li>이용자는 개인정보의 정확성 유지를 위해 최신 정보를 입력해야 하며, 부정확한 정보 입력으로 발생하는 손해에 대해 회사는 책임지지 않습니다.</li>
 </ol>
 </Section>

 <Section title="제7조 (개인정보의 안전성 확보 조치)">
 <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
 <ul>
 <li><strong>관리적 조치</strong>: 내부관리계획 수립·시행, 임직원 정기 교육</li>
 <li><strong>기술적 조치</strong>: 개인정보처리시스템 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
 <li><strong>비밀번호 처리</strong>: bcrypt 알고리즘을 이용한 단방향 암호화 저장</li>
 <li><strong>통신 보안</strong>: SSL/TLS를 이용한 전송 구간 암호화</li>
 <li><strong>물리적 조치</strong>: 전산실 및 자료보관실 등 접근 통제</li>
 </ul>
 </Section>

 <Section title="제8조 (쿠키의 설치·운영 및 거부)">
 <ol>
 <li>회사는 이용자에게 개인화된 서비스를 제공하기 위해 쿠키(cookie)를 사용합니다.</li>
 <li>쿠키는 이용자의 브라우저에 전송되는 소량의 정보로, 이용자 식별 및 서비스 편의 향상을 위해 사용됩니다.</li>
 <li>이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용이 제한될 수 있습니다.</li>
 </ol>
 </Section>

 <Section title="제9조 (개인정보 보호책임자)">
 <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 개인정보 관련 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
 <div className="legal-contact-box">
 <p><strong>개인정보 보호책임자</strong></p>
 <p>이메일: privacy@checkmate.kr</p>
 <p>문의 처리 시간: 평일 09:00 ~ 18:00 (공휴일 제외)</p>
 </div>
 <p style={{marginTop: 12}}>이용자는 개인정보 보호에 관한 모든 민원을 위 연락처로 신고할 수 있으며, 회사는 신속하고 성실하게 답변 드리겠습니다.</p>
 <p>개인정보 침해에 관한 신고·상담은 아래 기관에 문의하실 수 있습니다.</p>
 <ul>
 <li>개인정보 침해신고센터: privacy.kisa.or.kr / 118</li>
 <li>대검찰청 사이버범죄수사단: www.spo.go.kr / 02-3480-2000</li>
 <li>경찰청 사이버안전국: cyberbureau.police.go.kr / 182</li>
 </ul>
 </Section>

 <Section title="제10조 (개인정보처리방침의 변경)">
 <ol>
 <li>본 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경이 있을 경우 변경 사항을 시행일 최소 7일 전에 공지합니다.</li>
 <li>이용자에게 불리한 변경 사항의 경우 최소 30일 전에 공지하고 동의를 받겠습니다.</li>
 </ol>
 </Section>

 <div className="legal-footer-box">
 <p><strong>체크메이트 (CHECKMATE)</strong></p>
 <p>개인정보 문의: privacy@checkmate.kr</p>
 <p>본 방침은 2026년 06월 23일부터 시행됩니다.</p>
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
