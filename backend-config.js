// Public client settings only. Never put a Supabase service_role/secret key here.
// Fill these values after creating the Supabase project. The publishable/anon key
// is intended for browser use; database access must still be protected by RLS.
window.REFIT_CONFIG = {
  supabaseUrl: 'https://hoxkpuyaeyojxhchtwzg.supabase.co',
  supabasePublishableKey: 'sb_publishable_FEy9kf6nBhSX9u4JHHc6Qw_x4VB3gZr',
  features: { dietFoodSearchEnabled: true, dietPhotoAnalysisEnabled: false },
  privacy: {
    noticeVersion: '2026-11-05-v8',
    operatorName: '박진성',
    contactEmail: 'wlstjd2351@naver.com',
    retention: '서비스 이용 중 보관하며 회원 탈퇴 시 삭제',
    dataRegion: '대한민국 서울 (ap-northeast-2)',
    processorNotice: 'Supabase Pte. Ltd.(싱가포르)가 인증과 데이터 보관을 처리하며 주 데이터는 서울 리전에 저장됩니다. 가입·인증 메일은 Resend 운영사 Plus Five Five, Inc.(미국)를 통해 발송합니다. 이메일 주소, 발신 주소, 인증 메일 내용(인증 링크 포함), 발송·전달 로그가 미국에서 처리됩니다. 선택한 도쿄(ap-northeast-1)는 발송 리전이며 데이터 저장 위치는 미국입니다. Free 플랜에서는 이메일·로그 데이터가 계정 이용 중 30일 보관되고 이용 종료 후 잔여 고객 데이터는 최대 90일 안에 삭제된다고 Resend가 안내합니다. 운동·신체 기록은 Resend에 전송하지 않습니다. 운영 로그와 기술 지원 과정에서도 국외 처리가 발생할 수 있습니다.',
    recoveryEnabled: false
  }
};

