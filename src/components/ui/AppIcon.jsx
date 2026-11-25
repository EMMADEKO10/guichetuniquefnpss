'use client';

import React from 'react';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import AddCircleOutlineOutlined from '@mui/icons-material/AddCircleOutlineOutlined';
import AnalyticsOutlined from '@mui/icons-material/AnalyticsOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Autorenew from '@mui/icons-material/Autorenew';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import Check from '@mui/icons-material/Check';
import CheckBoxOutlined from '@mui/icons-material/CheckBoxOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import Close from '@mui/icons-material/Close';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import ContentCopy from '@mui/icons-material/ContentCopy';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import FolderCopyOutlined from '@mui/icons-material/FolderCopyOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import GppBadOutlined from '@mui/icons-material/GppBadOutlined';
import HistoryEduOutlined from '@mui/icons-material/HistoryEduOutlined';
import HistoryToggleOff from '@mui/icons-material/HistoryToggleOff';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import ImageSearchOutlined from '@mui/icons-material/ImageSearchOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import LockOpenOutlined from '@mui/icons-material/LockOpenOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined';
import Menu from '@mui/icons-material/Menu';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import OpenInNew from '@mui/icons-material/OpenInNew';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import Pause from '@mui/icons-material/Pause';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import PeopleOutlineOutlined from '@mui/icons-material/PeopleOutlineOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import QrCode2 from '@mui/icons-material/QrCode2';
import QrCodeScanner from '@mui/icons-material/QrCodeScanner';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import Refresh from '@mui/icons-material/Refresh';
import RocketLaunchOutlined from '@mui/icons-material/RocketLaunchOutlined';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Search from '@mui/icons-material/Search';
import SecurityOutlined from '@mui/icons-material/SecurityOutlined';
import StopCircleOutlined from '@mui/icons-material/StopCircleOutlined';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import Sync from '@mui/icons-material/Sync';
import TableRowsOutlined from '@mui/icons-material/TableRowsOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import VerifiedOutlined from '@mui/icons-material/VerifiedOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import ViewAgendaOutlined from '@mui/icons-material/ViewAgendaOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';

const ICON_REGISTRY = {
  institution: AccountBalanceOutlined,
  add: AddCircleOutlineOutlined,
  stats: AnalyticsOutlined,
  arrowForward: ArrowForward,
  autorenew: Autorenew,
  revoked: BlockOutlined,
  business: BusinessOutlined,
  chat: ChatBubbleOutlineOutlined,
  check: Check,
  checkbox: CheckBoxOutlined,
  success: CheckCircleOutlineOutlined,
  close: Close,
  upload: CloudUploadOutlined,
  copy: ContentCopy,
  dashboard: DashboardOutlined,
  delete: DeleteOutlineOutlined,
  pdf: DescriptionOutlined,
  download: DownloadOutlined,
  edit: EditOutlined,
  error: ErrorOutlineOutlined,
  documents: FolderCopyOutlined,
  folder: FolderOpenOutlined,
  gppBad: GppBadOutlined,
  audit: HistoryEduOutlined,
  expired: HistoryToggleOff,
  hourglass: HourglassEmpty,
  image: ImageSearchOutlined,
  info: InfoOutlined,
  chain: LinkOutlined,
  unlock: LockOpenOutlined,
  lock: LockOutlined,
  complement: MarkEmailReadOutlined,
  menu: Menu,
  guide: MenuBookOutlined,
  bell: NotificationsNoneOutlined,
  external: OpenInNew,
  palette: PaletteOutlined,
  pause: Pause,
  payment: PaymentsOutlined,
  users: PeopleOutlineOutlined,
  userAdd: PersonAddOutlined,
  user: PersonOutlineOutlined,
  pdfFile: PictureAsPdfOutlined,
  qr: QrCode2,
  camera: QrCodeScanner,
  verify: QrCodeScanner,
  review: RateReviewOutlined,
  receipt: ReceiptLongOutlined,
  refresh: Refresh,
  launch: RocketLaunchOutlined,
  save: SaveOutlined,
  clock: ScheduleOutlined,
  training: SchoolOutlined,
  search: Search,
  security: SecurityOutlined,
  stop: StopCircleOutlined,
  swap: SwapHoriz,
  sync: Sync,
  table: TableRowsOutlined,
  uploadFile: UploadFileOutlined,
  verified: VerifiedOutlined,
  seal: VerifiedUserOutlined,
  cards: ViewAgendaOutlined,
  warning: WarningAmberOutlined
};

const SIZE_MAP = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 22,
  xl: 30
};

export const APP_ICON_NAMES = Object.keys(ICON_REGISTRY);

/**
 * Registre central d'icônes vectorielles MUI Outlined du Guichet Unique FNPSS.
 */
export default function AppIcon({
  name,
  size = 'sm',
  className = '',
  style = {},
  title = ''
}) {
  const IconComp = ICON_REGISTRY[name] || InfoOutlined;
  const px = typeof size === 'number' ? size : (SIZE_MAP[size] || 16);

  return (
    <span
      className={`fnpss-icon ${className}`.trim()}
      aria-hidden={title ? undefined : 'true'}
      title={title || undefined}
      style={{ fontSize: `${px}px`, ...style }}
    >
      <IconComp sx={{ fontSize: `${px}px`, display: 'block' }} />
    </span>
  );
}
