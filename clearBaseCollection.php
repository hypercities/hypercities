<?php

/**
 * Clear base collection session variables.
 *
 * @author		David Shepard
 * @copyright	(c) 2010, The Regents of the University of California
 * @date		2010-01-01
 * @version		$Id
 */

require_once 'includes/serverSession.inc';

cServerSession::unsetVar('baseCollection');
cServerSession::unsetVar('baseCollectionAuthenticated');
cServerSession::unsetVar('permalink');

?>
