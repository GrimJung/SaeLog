// Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) 의 firebaseConfig 값.
// 이 값은 비밀번호가 아니라 "어느 프로젝트인지" 알려주는 주소라서 공개돼도 괜찮다.
// (데이터 보호는 firestore.rules 가 담당)
// null 이면 함께 쓰기 기능이 꺼지고, 이 기기에만 저장하는 모드로 동작한다.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDrrjanbYYrvc9Ek_boGRIlg5pY1zrlhIc",
  authDomain: "saelog-9c8a7.firebaseapp.com",
  projectId: "saelog-9c8a7",
  storageBucket: "saelog-9c8a7.firebasestorage.app",
  messagingSenderId: "78132488767",
  appId: "1:78132488767:web:893f7ded19413c066fe68a",
};
