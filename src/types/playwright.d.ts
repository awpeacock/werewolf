interface Location {
	line: number;
	column: number;
}

interface StatementMapEntry {
	start: Location;
	end: Location;
}

interface FunctionMapEntry {
	name: string;
	decl: StatementMapEntry;
	loc: StatementMapEntry;
	line: number;
}

interface BranchMapEntry {
	loc: StatementMapEntry;
	type: 'if' | 'cond-expr' | 'binary-expr' | 'switch' | 'default-arg' | 'loop';
	locations: StatementMapEntry[];
	line: number;
}

interface FileCoverage {
	path: string;
	statementMap: { [key: string]: StatementMapEntry };
	fnMap: { [key: string]: FunctionMapEntry };
	branchMap: { [key: string]: BranchMapEntry };
	s: { [key: string]: number };
	f: { [key: string]: number };
	b: { [key: string]: number[] };
	_coverageMetadata?: {
		hash: string;
		time: number;
	};
}

interface WindowCoverage {
	[filePath: string]: FileCoverage;
}

declare global {
	interface ShareData {
		url?: string;
		text?: string;
		title?: string;
		files?: File[];
	}
	interface Window {
		__coverage__?: WindowCoverage;
		__sharedData?: ShareData;
	}
}
