'use strict';

const dashengActions = [
  {id:'wave', label:'挥挥手', mood:'default', seconds:2.3, speech:['嘿，这边！俺在呢。','见着你啦，招个手！']},
  {id:'staff', label:'耍金箍棒', mood:'default', seconds:3, speech:['老伙计，走一招！','瞧这棒，使着真顺手。']},
  {id:'grow', label:'金箍棒变大', mood:'default', seconds:3.9, speech:['如意金箍棒，再长些！','大，大，大！这才趁手。']},
  {id:'vortex', label:'耍棍花', mood:'default', seconds:5.1, speech:['看俺老孙耍个棍花！']},
  {id:'turn', label:'转一圈', mood:'default', seconds:3, speech:['转个身，瞧瞧俺的披风！','兜一圈，给披风透透风。']},
  {id:'nap', label:'打个盹', mood:'sleeping', seconds:4.5, speech:['呼……梦里有桃。','棒子站岗，俺眯会儿。']},
  {id:'happy', label:'开怀大笑', mood:'happy', seconds:3.2, speech:['嘿嘿，胡须都笑翘了！','哈哈，好生痛快！']},
  {id:'angry', label:'变红发怒', mood:'angry', seconds:3, speech:['呔！谁偷了俺的桃？','桃核还在，桃呢？']},
  {id:'cloud', label:'筋斗云', mood:'happy', seconds:5.2,
    speech:['俺老孙一个筋斗，十万八千里！','筋斗云，走！花果山见。'],
    glideSpeech:['好云儿，接俺一程！','踩稳喽，咱们顺风走！']},
];

if (typeof module !== 'undefined') module.exports = dashengActions;
