// Skrypt do generowania kodów testowych
const codes = {
  lite: [],
  pro: [],
  premium: []
};

['lite', 'pro', 'premium'].forEach(plan => {
  for (let i = 0; i < 3; i++) {
    const code = `TEST-${plan.toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    codes[plan].push(code);
  }
});

console.log('\n=== KODY TESTOWE ===\n');
console.log('LITE:');
codes.lite.forEach(c => console.log(c));
console.log('\nPRO:');
codes.pro.forEach(c => console.log(c));
console.log('\nPREMIUM:');
codes.premium.forEach(c => console.log(c));
console.log('\n===================\n');
console.log('Skopiuj jeden kod PREMIUM i wklej na /activate');
console.log('UWAGA: Te kody NIE SĄ w bazie! Muszą być dodane ręcznie.\n');
