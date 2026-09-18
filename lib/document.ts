export type DocumentType="pdf"|"epub";
export type ReaderPage={index:number;label:string;imageUrl?:string;text?:string};
export type ReaderDocument={id:string;title:string;author?:string;type:DocumentType;pageCount:number;pages:ReaderPage[];coverUrl?:string};
