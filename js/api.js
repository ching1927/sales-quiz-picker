/*
 * 雲端介面約定（資料庫端 supabase/schema.sql 與前端頁面都以此為準）
 * 全部透過 Supabase 的 RPC（POST /rest/v1/rpc/<函式名>）呼叫，前端不直接讀寫資料表。
 *
 * 需要密碼（抽題與管理共用同一組密碼；密碼錯誤一律丟錯，錯誤訊息含 invalid_password）
 *   list_categories(p_pw)                       → [{ category, total, remaining }]  依分類名稱排序；total=該分類題數，remaining=本輪未抽題數
 *   draw_questions(p_pw, p_cats text[])         → [{ id, category, text, total, remaining, new_round }]
 *        依 p_cats 順序，每個分類各抽 1 題（只從該分類「本輪未抽」裡挑；已抽記錄全裝置共用）。
 *        該分類本輪已抽完 → 先自動開新一輪再抽（new_round=true），且新一輪第一題不與上一題相同（該分類只有 1 題時例外）。
 *        remaining 為抽完這題後的剩餘題數。p_cats 為空或含不存在的分類 → 丟錯。
 *   admin_login(p_pw)                           → boolean
 *   admin_list_questions(p_pw)                  → [{ id, category, text, drawn }]  依 category、id 排序
 *   admin_save_question(p_pw, p_id, p_category, p_text) → bigint(題目 id)  p_id 為 null＝新增，否則修改；category/text 不可空白
 *   admin_delete_question(p_pw, p_id)           → void
 *   admin_rename_category(p_pw, p_old, p_new)   → integer(受影響題數)  p_new 已存在則等於合併
 *   admin_reset(p_pw, p_category)               → void  p_category 為 null＝全部分類洗牌，否則只洗該分類
 */
(function () {
  var URL = 'https://uphowxeilvjaoffefoxs.supabase.co';
  var KEY = 'sb_publishable_wz55AD4hF1yahiyoseC6EQ_B1oMkaU2'; // 公開用金鑰（publishable），可放在網頁

  function rpc(fn, args) {
    return fetch(URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    }).then(function (res) {
      return res.text().then(function (t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) { /* 非 JSON 回應 */ }
        if (!res.ok) {
          var msg = (data && (data.message || data.error)) || ('HTTP ' + res.status);
          var err = new Error(msg);
          err.invalidPassword = String(msg).indexOf('invalid_password') !== -1;
          throw err;
        }
        return data;
      });
    });
  }

  window.Api = {
    listCategories: function (pw) { return rpc('list_categories', { p_pw: pw }); },
    drawQuestions: function (pw, cats) { return rpc('draw_questions', { p_pw: pw, p_cats: cats }); },
    adminLogin: function (pw) { return rpc('admin_login', { p_pw: pw }); },
    adminListQuestions: function (pw) { return rpc('admin_list_questions', { p_pw: pw }); },
    adminSaveQuestion: function (pw, id, category, text) {
      return rpc('admin_save_question', { p_pw: pw, p_id: id, p_category: category, p_text: text });
    },
    adminDeleteQuestion: function (pw, id) { return rpc('admin_delete_question', { p_pw: pw, p_id: id }); },
    adminRenameCategory: function (pw, oldName, newName) {
      return rpc('admin_rename_category', { p_pw: pw, p_old: oldName, p_new: newName });
    },
    adminReset: function (pw, category) { return rpc('admin_reset', { p_pw: pw, p_category: category || null }); }
  };
})();
