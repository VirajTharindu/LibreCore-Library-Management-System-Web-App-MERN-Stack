declare module 'pouchdb' {
  interface PouchDB {
    get<T>(id: string): Promise<T>;
    put(doc: object): Promise<{ rev: string }>;
    remove(doc: { _id: string; _rev: string }): Promise<{ rev: string }>;
    allDocs<T>(opts?: { include_docs?: boolean }): Promise<{
      rows: Array<{ id: string; doc?: T | null }>;
    }>;
  }
  const PouchDB: new (name: string) => PouchDB;
  export default PouchDB;
}
