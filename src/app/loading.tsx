export default function Loading() {
  return (
    <div className="lazy-suspense-fallback">
      <div className="lazy-spinner" />
      <span style={{ marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>Loading DropTalk...</span>
    </div>
  );
}
