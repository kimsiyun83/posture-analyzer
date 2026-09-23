import Link from 'next/link';
import { AppInstallButton } from '../../components/AppProvider';

export default function InstallPage() {
  return <div className="care-app"><header className="care-header"><Link href="/">← 홈</Link><b>앱 설치</b><Link href="/customer">내 기록</Link></header>
    <main className="care-main">
      <section className="care-card">
        <span className="ux-kicker">매일 더 가까이, LULU CARE</span>
        <h1>내 몸을 돌보는 앱,<br/>홈 화면에 담아두세요.</h1>
        <p>아이콘을 누르면 주소창 없는 앱 화면으로 열려요. 자세 검사, 업무 자세 알림, 인바디 기록을 그대로 이용할 수 있어요.</p>
        <AppInstallButton/>
      </section>
      <section className="care-card"><h2>안드로이드 · Chrome</h2><ol><li>Chrome에서 이 페이지를 열어요.</li><li>위 설치 버튼 또는 오른쪽 위 ⋮ 메뉴를 눌러요.</li><li>‘앱 설치’ 또는 ‘홈 화면에 추가’ → ‘설치’를 선택해요.</li></ol></section>
      <section className="care-card"><h2>갤럭시 · 삼성 인터넷</h2><p>브라우저 메뉴에서 ‘현재 페이지 추가’ → ‘홈 화면’을 선택하세요. 버전에 따라 ‘앱 설치’로 표시될 수 있어요.</p></section>
      <section className="care-card"><h2>아이폰 · Safari</h2><ol><li>Safari에서 이 페이지를 열어요.</li><li>공유 버튼 → ‘홈 화면에 추가’를 선택해요.</li><li>‘웹 앱으로 열기’가 보이면 켠 뒤 ‘추가’를 눌러요.</li></ol></section>
      <section className="care-card"><h2>시작하기 전에</h2><ul>
        <li>카카오톡·네이버 등의 앱 안에서 열었다면 Chrome 또는 Safari로 다시 열어 주세요.</li>
        <li>기존 계정으로 로그인하면 저장된 검사 기록을 이어서 볼 수 있어요. 설치 후 로그인을 다시 요청할 수 있어요.</li>
        <li>처음 측정할 때 카메라 사용을 허용해 주세요.</li>
        <li>검사와 기록 저장에는 인터넷 연결이 필요해요.</li>
        <li>업무 자세 알림은 앱 화면을 켜 놓고 사용해 주세요. 화면 잠금이나 다른 앱으로 이동하면 측정·알림이 제한돼요.</li>
      </ul></section>
      <Link href="/" className="care-primary">LULU CARE 시작하기 →</Link>
    </main>
  </div>;
}
