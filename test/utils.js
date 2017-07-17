'use strict'

export async function assertRevert(f) {
	try {
		await f()
	} catch(error) {
		assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');
	}
}

