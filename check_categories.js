console.log('檢查分類資料'); 
const db = require('firebase-admin/firestore').getFirestore();
db.collection('materialCategories').get().then(snapshot => {
  console.log('總分類數量:', snapshot.size);
  snapshot.docs.forEach(doc => {
    console.log('分類ID:', doc.id, '分類資料:', doc.data());
  });
});
