import SiteNavMenu from './SiteNavMenu';

// layout 使用的伺服器端導覽入口；開合選單、焦點管理與路由高亮全部由
// <SiteNavMenu /> 這個 client island 負責。
export default function SiteNav() {
  return <SiteNavMenu />;
}
