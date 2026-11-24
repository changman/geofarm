// GPS 위치 구독. onPosition({lat,lng,accuracy}), 실패 시 onError(message).
export function watchLocation(onPosition, onError) {
  if (!navigator.geolocation) {
    onError('이 브라우저는 위치 기능을 지원하지 않습니다.');
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) => onPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
    (e) => onError(e.code === 1 ? '위치 권한이 거부되었습니다.' : '위치를 가져오지 못했습니다.'),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
