import { useLocation, useNavigate } from 'react-router-dom';
import LayerPopup from './LayerPopup';

/**
 * 목록 페이지 + 등록/수정/보기 레이어 팝업 (bnk-mes 스타일)
 * - pathname으로 등록/수정/보기 구분 후 해당 컴포넌트를 직접 렌더 (Routes 미사용으로 매칭 이슈 방지)
 */
function parseIdFromPath(pathname, listPath) {
  const rest = pathname.slice(listPath.length + 1) || '';
  const editMatch = rest.match(/^([^/]+)\/edit$/);
  if (editMatch) return editMatch[1];
  const viewMatch = rest.match(/^([^/]+)$/);
  if (viewMatch) return viewMatch[1];
  return null;
}

export default function ListWithLayerPopup({
  basePath,
  ListComponent,
  FormComponent,
  DetailComponent,
  titleAdd,
  titleView,
  titleEdit,
  popupMaxWidth,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const listPath = `/${basePath}`;
  const isNew = location.pathname === `${listPath}/new`;
  const isEdit = new RegExp(`^${listPath}/[^/]+/edit$`).test(location.pathname);
  const isView = !isNew && !isEdit && new RegExp(`^${listPath}/[^/]+$`).test(location.pathname);
  const showPopup = isNew || isEdit || isView;

  const popupTitle = isNew ? titleAdd : isEdit ? titleEdit : isView ? titleView : '';
  const goList = () => navigate(listPath);
  const id = parseIdFromPath(location.pathname, listPath);

  let popupContent = null;
  if (showPopup) {
    if (isNew) {
      popupContent = <FormComponent inModal onSuccess={goList} onCancel={goList} />;
    } else if (isEdit && id) {
      popupContent = (
        <FormComponent
          inModal
          onSuccess={goList}
          onCancel={goList}
          factoryId={Number(id)}
          processId={Number(id)}
          workId={Number(id)}
          machineId={Number(id)}
          partId={Number(id)}
        />
      );
    } else if (isView && id) {
      popupContent = <DetailComponent inModal onClose={goList} id={id} title={titleView} />;
    }
  }

  return (
    <>
      <ListComponent />
      {showPopup && popupContent && (
        <LayerPopup
          title={popupTitle}
          onClose={goList}
          hideTitle={isView}
          aria-labelledby="layer-popup-title"
          maxWidth={popupMaxWidth}
        >
          {popupContent}
        </LayerPopup>
      )}
    </>
  );
}
