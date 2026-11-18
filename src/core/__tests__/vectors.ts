// 鍵導出・メッセージ署名の仕様を固定するテストベクトル（実資産を持たない検証専用の値）。変更しないこと。
// signatureは標準のメッセージ署名形式（RFC6979の決定的署名、bitcoinjs-message@2.2.0で生成）。

export const KEY_VECTORS = [
  {
    entropyHex: '0000000000000000000000000000000000000000000000000000000000000000',
    mnemonic:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    address: 'MBdpQaA3bFJQCrcKKsoZyDgc55FJY7Wkre',
    signatures: [
      {
        message: 'hello',
        signature: 'IF0UAsyD/pJvZFmnuKkKleWwymClF9cvYLk4wpJUTULLboNyEcBirjHKyItz2ndddis9JLlheJrhaocgn9gdw5g=',
      },
      {
        message: 'モナコイン送金テスト 🍙',
        signature: 'IJzzDgtH4TNa7KXrbozUWQ3XOV/JpV1ahylyWrK1xqDIbZ0tg9nacc4mRXOiiVyj22OvjhaotOVHuxoixpj+fRg=',
      },
      {
        message: 'x'.repeat(300),
        signature: 'IE3BUlkyt6bZamCILmRreBAMzw9mrAEVYkdbFJ3y6GmZH+thGux/hrtIif2hTfkaTqblG4TbWJYzaK5uvEQgNaM=',
      },
    ],
  },
  {
    entropyHex: '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
    mnemonic:
      'absurd avoid scissors anxiety gather lottery category door army half long cage bachelor another expect people blade school educate curtain scrub monitor lady beyond',
    address: 'MBNQ6HS13uuQkX9m2RVB88vWeHd379PMJ2',
    signatures: [
      {
        message: 'hello',
        signature: 'IA6WPtn+RduhyJd7zgny7FhQe2pN81QUp4NK+C03dIFdPlKPkmIbGuu2x0csOxfRJnUteHXii8NNDy7sEgsY0mw=',
      },
      {
        message: 'モナコイン送金テスト 🍙',
        signature: 'IDlnxxJlFyL1Yxj7dGG1GCqjYD/FqG0SY0qlFePmFGylNmzVSQK4kigcSJobTQVM+K//+F4J12K6/przt9ZGCE8=',
      },
      {
        message: 'x'.repeat(300),
        signature: 'IFTTa6T0rXbbMZk3wn3LjzwWfYjXx/h3PiY3J0ZOrNsgH3BfaNoX/6UN25JPLMUTsR0a4QJjpTuBhuhlU0zffJ4=',
      },
    ],
  },
  {
    entropyHex: '7179f13cd556828621d8eb38cb34925ae564e168a9501a3b988769cdc8f5ef1f',
    mnemonic:
      'imitate sort execute primary habit drink manual buddy decide fluid cause remind film idle pencil claw boss system canyon squeeze symptom kit round timber',
    address: 'MUkqf8jpuy9QHqisVpRNdsgoQ2tB9u9rJg',
    signatures: [
      {
        message: 'hello',
        signature: 'H2BFsVaPQK/4xw5F83/DAvw9smOwsIE9tSWrLnWtNF8OMO7VU7ysJ8tGoYnNaEFyjKVfSVBCVYqxTymVOzMbzKU=',
      },
      {
        message: 'モナコイン送金テスト 🍙',
        signature: 'IBjab/1cp52J0rPvHv0mzpGzvH4HrkidSEGyI3qYGYvLcbDVW0HDxqTnoCES54HdVmS7jutjp52Aq+j/TPcy6C0=',
      },
      {
        message: 'x'.repeat(300),
        signature: 'H9QB8ztENrySmRDC2Ok8oqIFfyvYt+qvPwm29vSd4SfoMexkQ+xG0jU4jSVC9qIzdQUj/4i9jCkULhQXxJOBuUI=',
      },
    ],
  },
  {
    entropyHex: 'fe620eba02e3bc24430cc4e754e25282ded5687927a6b10ad252581f06539bd6',
    mnemonic:
      'wrist away purse alarm design banana around obtain trap poem net aisle unhappy reflect tonight visit rain final nest rabbit vacant clap hungry soup',
    address: 'MCbXQr3Hkim4atTHtLErpcuUgSSQ41PZLX',
    signatures: [
      {
        message: 'hello',
        signature: 'IDXBNFN7uIb1bICEaEke+h2RUXzv5gt8c1UOOrTNpm5WT78aAD08xzgiEczI4ahuQ60lSBLazYkQPwX8lXTxE7I=',
      },
      {
        message: 'モナコイン送金テスト 🍙',
        signature: 'H5yDYUrj3VulFarHQIQoq4wQMVmzz2BZOc72dyzuPsj2V3/TcPHC3s+Ne1xVeMMaGMobb0agpZp1ci1VHLghjQw=',
      },
      {
        message: 'x'.repeat(300),
        signature: 'IPCKta1AhaQfJ+YDG/VLdQlWrwViYI+J+1fxszhwJHFBJtFTb84xto0+TIwFIYnot1XKV3UPV9qXUzK9f7la3L0=',
      },
    ],
  },
]
