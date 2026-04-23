export const TNEA_CONFIG = {
  id: 'tnea',
  name: 'TNEA Cutoff',
  description: 'Explore TNEA cutoff scores for TN engineering colleges',
  years: ['2020', '2021', '2022', '2023', '2024', '2025'],
  communities: ['OC', 'BC', 'BCM', 'MBC', 'SC', 'SCA', 'ST'],
  seatKeys: {
    OC: { tl: 'octl', al: 'ocal' },
    BC: { tl: 'bctl', al: 'bcal' },
    BCM: { tl: 'bcmtl', al: 'bcmal' },
    MBC: { tl: 'mbctl', al: 'mbcal' },
    SC: { tl: 'sctl', al: 'scal' },
    SCA: { tl: 'scatl', al: 'scaal' },
    ST: { tl: 'sttl', al: 'stal' },
  },
  districtNorm: {
    'Kanchipuram': 'Kancheepuram', 'Sivaganga': 'Sivagangai',
    'Kallakkurichi': 'Kallakurichi', 'Thiruvallur': 'Tiruvallur',
    'Tirupur': 'Tiruppur', 'Nagappattinam': 'Nagapattinam',
    'Thiruppathur': 'Tirupattur', 'Thiruppattur': 'Tirupattur',
  },
  dataPath: '/assets/db/tnea/cutoff/',
  chunkSize: 60,
};
