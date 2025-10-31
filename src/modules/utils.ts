import Meet from "./Meet/api";

export default class Utils {
  constructor() {
  }
  public getRGB(color: string) {
    var sColor = color.toLowerCase();
    // Regular expression for hexadecimal color values
    var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
    // If it's a hexadecimal color
    if (sColor && reg.test(sColor)) {
      if (sColor.length === 4) {
        var sColorNew = "#";
        for (var i = 1; i < 4; i += 1) {
          sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
        }
        sColor = sColorNew;
      }
      // Process six-digit color values
      var sColorChange = [];
      for (var i = 1; i < 7; i += 2) {
        sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
      }
      return sColorChange;
    }
    return sColor;
  }

  /**
   * Compatible with old version
   * @deprecated
   * @param queryText 
   * @returns 
   */
  public async getRelatedText(queryText: string) {
    return await Meet.Zotero.getRelatedText(queryText)
  }
}
